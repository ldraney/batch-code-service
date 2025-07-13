const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const { promisify } = require('util');

const execAsync = promisify(exec);

// Path to the bash script
const SCRIPT_PATH = path.join(__dirname, '..', 'scripts', 'generate-batch-code.sh');

// Cache for generated codes to avoid duplicates
const recentCodes = new Set();
const MAX_CACHE_SIZE = 1000;

/**
 * Execute the bash script to generate a batch code
 * @returns {Promise<string>} Generated batch code
 */
async function executeBashScript() {
  try {
    // Ensure script exists and is executable
    await fs.access(SCRIPT_PATH);
    await fs.chmod(SCRIPT_PATH, 0o755);

    const { stdout, stderr } = await execAsync(`bash "${SCRIPT_PATH}"`);
    
    if (stderr) {
      console.warn('Bash script warning:', stderr);
    }

    const code = stdout.trim();
    
    // Validate code format (6 alphanumeric characters)
    if (!/^[A-Z0-9]{6}$/.test(code)) {
      throw new Error(`Invalid code format: ${code}`);
    }

    return code;
  } catch (error) {
    throw new Error(`Failed to execute bash script: ${error.message}`);
  }
}

/**
 * Generate a unique batch code with collision detection
 * @returns {Promise<string>} Unique batch code
 */
async function generateBatchCode() {
  const maxRetries = 10;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const code = await executeBashScript();
      
      // Check for duplicates in recent codes
      if (!recentCodes.has(code)) {
        // Add to cache
        recentCodes.add(code);
        
        // Maintain cache size
        if (recentCodes.size > MAX_CACHE_SIZE) {
          const firstCode = recentCodes.values().next().value;
          recentCodes.delete(firstCode);
        }
        
        return code;
      }
      
      console.warn(`Duplicate code generated: ${code}, retrying...`);
      attempt++;
      
      // Add small delay to increase entropy
      await new Promise(resolve => setTimeout(resolve, 10));
      
    } catch (error) {
      attempt++;
      console.error(`Generation attempt ${attempt} failed:`, error.message);
      
      if (attempt >= maxRetries) {
        throw error;
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
    }
  }

  throw new Error(`Failed to generate unique code after ${maxRetries} attempts`);
}

/**
 * Validate if a code follows the expected format
 * @param {string} code - Code to validate
 * @returns {boolean} True if valid
 */
function validateBatchCode(code) {
  return typeof code === 'string' && /^[A-Z0-9]{6}$/.test(code);
}

/**
 * Get statistics about code generation
 * @returns {object} Generation statistics
 */
function getGenerationStats() {
  return {
    cacheSize: recentCodes.size,
    maxCacheSize: MAX_CACHE_SIZE,
    scriptPath: SCRIPT_PATH
  };
}

module.exports = {
  generateBatchCode,
  validateBatchCode,
  getGenerationStats
};
