import connectDB from '../config/db.js';
import { getExecutiveIntelligence } from '../services/executiveIntelligenceService.js';

const run = async () => {
  try {
    await connectDB();
    const result = await getExecutiveIntelligence();
    console.log('OK', Object.keys(result || {}));
    console.log('summary', result?.summary || 'none');
  } catch (error) {
    console.error('STACK_START');
    console.error(error && error.stack ? error.stack : error);
    console.error('STACK_END');
    process.exit(1);
  }
};

run();
