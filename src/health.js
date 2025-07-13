const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');

const { getGenerationStats } = require('./generator');
const { metrics } = require('./metrics');

const execAsync = promisify(exec);

// Health check configuration
const HEALTH_CONFIG = {
  maxResponseTime: 5000, // 5 seconds
  criticalDiskUsage: 0.9, // 90%
  criticalMemoryUsage: 0.95, // 95%
  scriptPath: path.join(__dirname, '..', 'scripts', 'generate-batch-code.sh')
};

/**
 * Check if bash script is accessible and executable
 */
async function checkBashScript() {
  try {
    await fs.access(HEALTH_CONFIG.scriptPath);
    const stats = await fs.stat(HEALTH_CONFIG.scriptPath);
    
    // Check if file is executable
    const isExecutable = !!(stats.mode & parseInt('111', 8));
    
    return {
      status: 'healthy',
      accessible: true,
      executable: isExecutable,
      path: HEALTH_CONFIG.scriptPath,
      size: stats.size,
      modified: stats.mtime
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      accessible: false,
      executable: false,
      error: error.message,
      path: HEALTH_CONFIG.scriptPath
    };
  }
}

/**
 * Check system resources
 */
async function checkSystemResources() {
  try {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = usedMemory / totalMemory;

    // Check disk usage (root partition)
    let diskUsage = 0;
    try {
      const { stdout } = await execAsync("df / | tail -1 | awk '{print $5}' | sed 's/%//'");
      diskUsage = parseInt(stdout.trim()) / 100;
    } catch (diskError) {
      console.warn('Could not check disk usage:', diskError.message);
    }

    const cpuLoad = os.loadavg();

    return {
      status: memoryUsage > HEALTH_CONFIG.criticalMemoryUsage || 
              diskUsage > HEALTH_CONFIG.criticalDiskUsage ? 'critical' : 'healthy',
      memory: {
        total: totalMemory,
        free: freeMemory,
        used: usedMemory,
        usage: memoryUsage,
        critical: memoryUsage > HEALTH_CONFIG.criticalMemoryUsage
      },
      disk: {
        usage: diskUsage,
        critical: diskUsage > HEALTH_CONFIG.criticalDiskUsage
      },
      cpu: {
        load1m: cpuLoad[0],
        load5m: cpuLoad[1],
        load15m: cpuLoad[2],
        cores: os.cpus().length
      },
      uptime: os.uptime()
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message
    };
  }
}

/**
 * Test batch code generation
 */
async function testBatchGeneration() {
  const startTime = Date.now();
  
  try {
    // Import here to avoid circular dependency
    const { generateBatchCode } = require('./generator');
    
    const code = await generateBatchCode();
    const responseTime = Date.now() - startTime;
    
    // Validate code format
    const isValid = /^[A-Z0-9]{6}$/.test(code);
    
    return {
      status: isValid && responseTime < HEALTH_CONFIG.maxResponseTime ? 'healthy' : 'degraded',
      testCode: code,
      responseTime,
      valid: isValid,
      maxResponseTime: HEALTH_CONFIG.maxResponseTime
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      status: 'unhealthy',
      error: error.message,
      responseTime
    };
  }
}

/**
 * Check environment configuration
 */
function checkEnvironment() {
  const requiredEnvVars = ['NODE_ENV'];
  const optionalEnvVars = ['PORT', 'WEBHOOK_SECRET', 'SENTRY_DSN'];
  
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  const present = [...requiredEnvVars, ...optionalEnvVars]
    .filter(envVar => process.env[envVar])
    .reduce((acc, envVar) => {
      acc[envVar] = envVar === 'WEBHOOK_SECRET' ? '***' : process.env[envVar];
      return acc;
    }, {});

  return {
    status: missing.length === 0 ? 'healthy' : 'degraded',
    missing,
    present,
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch
  };
}

/**
 * Main health check function
 */
async function healthCheck() {
  const startTime = Date.now();
  
  try {
    // Run all health checks in parallel
    const [
      bashScript,
      systemResources,
      batchGeneration,
      environment,
      generationStats,
      currentMetrics
    ] = await Promise.all([
      checkBashScript(),
      checkSystemResources(),
      testBatchGeneration(),
      Promise.resolve(checkEnvironment()),
      Promise.resolve(getGenerationStats()),
      metrics.getCurrentMetrics()
    ]);

    // Determine overall status
    const statuses = [
      bashScript.status,
      systemResources.status,
      batchGeneration.status,
      environment.status
    ];

    let overallStatus = 'healthy';
    if (statuses.includes('unhealthy')) {
      overallStatus = 'unhealthy';
    } else if (statuses.includes('critical')) {
      overallStatus = 'critical';
    } else if (statuses.includes('degraded')) {
      overallStatus = 'degraded';
    }

    const responseTime = Date.now() - startTime;

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTime,
      version: process.env.npm_package_version || 'unknown',
      checks: {
        bashScript,
        systemResources,
        batchGeneration,
        environment
      },
      stats: {
        generation: generationStats,
        metrics: currentMetrics
      }
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      status: 'error',
      timestamp: new Date().toISOString(),
      responseTime,
      error: error.message,
      version: process.env.npm_package_version || 'unknown'
    };
  }
}

module.exports = {
  healthCheck,
  checkBashScript,
  checkSystemResources,
  testBatchGeneration,
  checkEnvironment
};
