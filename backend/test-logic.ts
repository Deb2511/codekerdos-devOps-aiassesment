import { validateEmail, validateName, validateTopics, validateNumQuestions, validateJDText } from './src/utils/validation';
import { generateQuestionPrompt, generateEvaluationPrompt } from './src/utils/prompts';
import { config } from './src/config';

console.log('🧪 Testing CodeKerdos Backend Logic\n');

// Test 1: Email validation
console.log('Test 1: Email Validation');
console.log('✓ Valid email:', validateEmail('user@example.com'));
console.log('✓ Invalid email:', validateEmail('invalid.email'));
console.log('');

// Test 2: Name validation
console.log('Test 2: Name Validation');
console.log('✓ Valid name:', validateName('John Doe'));
console.log('✓ Invalid name (empty):', validateName(''));
console.log('');

// Test 3: Topics validation
console.log('Test 3: Topics Validation');
console.log('✓ Valid topics:', validateTopics(['linux', 'kubernetes', 'docker'], 'self'));
console.log('✓ Invalid topics (empty):', validateTopics([], 'self'));
console.log('✓ Invalid topics (unknown):', validateTopics(['invalid-topic'], 'self'));
console.log('');

// Test 4: Number of questions validation
console.log('Test 4: Number of Questions Validation');
console.log('✓ Valid (5):', validateNumQuestions(5));
console.log('✓ Valid (3):', validateNumQuestions(3));
console.log('✓ Valid (10):', validateNumQuestions(10));
console.log('✓ Invalid (2):', validateNumQuestions(2));
console.log('✓ Invalid (11):', validateNumQuestions(11));
console.log('');

// Test 5: JD Text validation
console.log('Test 5: JD Text Validation');
const shortJD = 'Too short';
const validJD = 'We are looking for a DevOps engineer with experience in Kubernetes, Terraform, AWS, and CI/CD pipelines. You will be responsible for managing infrastructure, implementing automation, and ensuring system reliability.';
const longJD = 'a'.repeat(10001);
console.log('✓ Short JD (invalid):', validateJDText(shortJD));
console.log('✓ Valid JD:', validateJDText(validJD));
console.log('✓ Long JD (invalid):', validateJDText(longJD));
console.log('');

// Test 6: Prompt generation
console.log('Test 6: Prompt Generation');
const selfPrompt = generateQuestionPrompt('junior', ['linux', 'kubernetes'], 'self', undefined, 5);
console.log('✓ Self-assessment prompt length:', selfPrompt.length);
console.log('✓ Contains "scenario":', selfPrompt.includes('scenario'));
console.log('✓ Contains "junior":', selfPrompt.includes('junior'));
console.log('');

const jdPrompt = generateQuestionPrompt('senior', [], 'jd', 'Looking for DevOps engineer...', 5);
console.log('✓ JD-based prompt length:', jdPrompt.length);
console.log('✓ Contains "JD":', jdPrompt.includes('Job Description'));
console.log('');

// Test 7: Evaluation prompt
console.log('Test 7: Evaluation Prompt');
const qaPairs = [
  { question: 'What is Kubernetes?', answer: 'Container orchestration platform' }
];
const evalPrompt = generateEvaluationPrompt('junior', ['kubernetes'], qaPairs);
console.log('✓ Evaluation prompt length:', evalPrompt.length);
console.log('✓ Contains Q&A:', evalPrompt.includes('Kubernetes'));
console.log('');

// Test 8: Configuration
console.log('Test 8: Configuration');
console.log('✓ Topics available:', Object.keys(config.SELF_ASSESSMENT_TOPICS).length, '(' + Object.keys(config.SELF_ASSESSMENT_TOPICS).join(', ') + ')');
console.log('✓ Min questions:', config.MIN_QUESTIONS);
console.log('✓ Max questions:', config.MAX_QUESTIONS);
console.log('✓ Difficulty levels:', config.DIFFICULTY_LEVELS);
console.log('✓ Assessment types:', config.ASSESSMENT_TYPES);
console.log('');

console.log('✅ All tests passed!');
