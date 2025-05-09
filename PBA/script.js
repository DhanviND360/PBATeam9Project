// API URL - Change this to your actual API URL when deploying
const API_URL = 'http://localhost:8000';

// DOM Elements
const startQuizBtn = document.getElementById('start-quiz-btn');
const beginQuizBtn = document.getElementById('begin-quiz-btn');
const quizStartSection = document.getElementById('quiz-start');
const quizQuestionsSection = document.getElementById('quiz-questions');
const quizResultsSection = document.getElementById('quiz-results');
const classSelect = document.getElementById('class-select');
const questionContainer = document.getElementById('question-container');
const currentQuestionSpan = document.getElementById('current-question');
const totalQuestionsSpan = document.getElementById('total-questions');
const totalQuestionsResultSpan = document.getElementById('total-questions-result');
const timeRemainingSpan = document.getElementById('time-remaining');
const prevQuestionBtn = document.getElementById('prev-question');
const nextQuestionBtn = document.getElementById('next-question');
const submitQuizBtn = document.getElementById('submit-quiz');
const scorePercentageSpan = document.getElementById('score-percentage');
const correctAnswersSpan = document.getElementById('correct-answers');
const tokensEarnedSpan = document.getElementById('tokens-earned');
const loginBtn = document.querySelector('.login-btn');
const signupBtn = document.querySelector('.signup-btn');
const viewPlanBtn = document.getElementById('view-plan-btn');

// Global Variables
let quizData = null;
let currentQuestionIndex = 0;
let userAnswers = {};
let timerInterval = null;
let remainingSeconds = 2700; // 45 minutes in seconds
let currentUser = null;

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // Start quiz button click - scrolls to the quiz section
    if (startQuizBtn) {
        startQuizBtn.addEventListener('click', () => {
            document.querySelector('#quiz').scrollIntoView({
                behavior: 'smooth'
            });
        });
    }

    // Begin quiz button click - starts the quiz
    if (beginQuizBtn) {
        beginQuizBtn.addEventListener('click', startQuiz);
    }

    // Navigation buttons
    if (prevQuestionBtn) {
        prevQuestionBtn.addEventListener('click', navigateToPrevQuestion);
    }

    if (nextQuestionBtn) {
        nextQuestionBtn.addEventListener('click', navigateToNextQuestion);
    }

    if (submitQuizBtn) {
        submitQuizBtn.addEventListener('click', submitQuiz);
    }
    
    // Login button click
    if (loginBtn) {
        loginBtn.addEventListener('click', showLoginModal);
    }
    
    // Signup button click
    if (signupBtn) {
        signupBtn.addEventListener('click', showSignupModal);
    }
    
    // View study plan button
    if (viewPlanBtn) {
        viewPlanBtn.addEventListener('click', showStudyPlan);
    }
    
    // Create modals on page load
    createModals();
    
    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
    
    // Add event delegation for quiz option selection
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('option-item') || e.target.closest('.option-item')) {
            const optionItem = e.target.classList.contains('option-item') ? e.target : e.target.closest('.option-item');
            const questionIndex = parseInt(optionItem.dataset.questionIndex);
            const option = optionItem.dataset.option;
            selectOption(questionIndex, option);
        }
    });
});

// Functions
async function startQuiz() {
    const selectedClass = classSelect.value;
    
    try {
        // Show loading state
        beginQuizBtn.disabled = true;
        beginQuizBtn.textContent = 'Loading...';
        
        // Try to fetch the quiz from the API
        try {
            const response = await fetch(`${API_URL}/quiz/new?class_name=${selectedClass}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
                // Timeout after 10 seconds to give the API more time to respond
                signal: AbortSignal.timeout(10000)
            });
            
            if (response.ok) {
                quizData = await response.json();
                console.log('Successfully fetched quiz data from API');
            } else {
                // If API returns error, fall back to demo mode
                console.error('API returned an error, falling back to demo mode');
                throw new Error('API returned an error');
            }
        } catch (apiError) {
            console.error('API connection failed:', apiError);
            console.log('Falling back to demo mode');
            
            // Use the demo quiz instead
            loadDemoQuiz();
            return;
        }
        
        // Update UI with quiz data
        totalQuestionsSpan.textContent = quizData.questions.length;
        totalQuestionsResultSpan.textContent = quizData.questions.length;
        
        // Hide start screen, show questions
        quizStartSection.classList.add('hidden');
        quizQuestionsSection.classList.remove('hidden');
        
        // Start the timer
        startTimer();
        
        // Load the first question
        loadQuestion(0);
    } catch (error) {
        console.error('Error starting quiz:', error);
        alert('Failed to load quiz. Switching to demo mode.');
        beginQuizBtn.disabled = false;
        beginQuizBtn.textContent = 'Begin Test';
        
        // Use the demo quiz instead
        loadDemoQuiz();
    }
}

function startTimer() {
    // Start with 45 minutes (2700 seconds)
    remainingSeconds = 2700;
    updateTimerDisplay();
    
    // Update timer every second
    timerInterval = setInterval(() => {
        remainingSeconds--;
        updateTimerDisplay();
        
        // Check time remaining from server occasionally
        if (remainingSeconds % 10 === 0 && quizData.session_id && !quizData.session_id.includes('demo')) {
            checkTimeRemaining();
        }
        
        // Auto-submit when time runs out
        if (remainingSeconds <= 0) {
            clearInterval(timerInterval);
            submitQuiz();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    timeRemainingSpan.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Add warning color when less than 5 minutes left
    if (remainingSeconds < 300) {
        timeRemainingSpan.style.color = '#ff0000';
    }
}

async function checkTimeRemaining() {
    if (!quizData || !quizData.session_id || quizData.session_id.includes('demo')) return;
    
    try {
        const response = await fetch(`${API_URL}/quiz/time-remaining/${quizData.session_id}`);
        
        if (response.ok) {
            const data = await response.json();
            
            // If time has expired on the server, submit the quiz
            if (data.time_expired) {
                clearInterval(timerInterval);
                submitQuiz();
            }
        }
    } catch (error) {
        console.error('Error checking time remaining:', error);
    }
}

function loadQuestion(index) {
    if (!quizData || !quizData.questions || quizData.questions.length === 0) {
        console.error('No quiz data available');
        return;
    }
    
    // Update current question index
    currentQuestionIndex = index;
    currentQuestionSpan.textContent = currentQuestionIndex + 1;
    
    // Get the current question
    const question = quizData.questions[index];
    
    // Create the question HTML
    questionContainer.innerHTML = `
        <div class="question">
            <h3>${question.question}</h3>
            <p class="question-meta">Subject: ${question.subject} | Chapter: ${question.chapter} | Difficulty: ${question.difficulty}</p>
            <ul class="options">
                ${question.options.map((option, optionIndex) => `
                    <li 
                        class="option-item ${userAnswers[index] === option ? 'selected' : ''}" 
                        data-option="${option}"
                        data-question-index="${index}"
                    >
                        ${String.fromCharCode(65 + optionIndex)}. ${option}
                    </li>
                `).join('')}
            </ul>
        </div>
    `;
    
    // Update navigation buttons
    prevQuestionBtn.disabled = index === 0;
    nextQuestionBtn.disabled = index === quizData.questions.length - 1;
    
    // Show submit button on the last question
    if (index === quizData.questions.length - 1) {
        submitQuizBtn.classList.remove('hidden');
    } else {
        submitQuizBtn.classList.add('hidden');
    }
}

// Function to select an option
function selectOption(questionIndex, option) {
    // Store the user's answer
    userAnswers[questionIndex] = option;
    
    // Update the UI to show the selected option
    const optionItems = document.querySelectorAll('.option-item');
    optionItems.forEach(item => {
        if (item.dataset.questionIndex === questionIndex.toString() && item.dataset.option === option) {
            item.classList.add('selected');
        } else if (item.dataset.questionIndex === questionIndex.toString()) {
            item.classList.remove('selected');
        }
    });
}

function navigateToPrevQuestion() {
    if (currentQuestionIndex > 0) {
        loadQuestion(currentQuestionIndex - 1);
    }
}

function navigateToNextQuestion() {
    if (currentQuestionIndex < quizData.questions.length - 1) {
        loadQuestion(currentQuestionIndex + 1);
    }
}

async function submitQuiz() {
    if (!quizData || !quizData.session_id) {
        console.error('No quiz session to submit');
        return;
    }
    
    try {
        // Show loading state
        submitQuizBtn.disabled = true;
        submitQuizBtn.textContent = 'Submitting...';
        
        // Stop the timer
        clearInterval(timerInterval);
        
        let result;
        
        // For demo session, calculate results locally
        if (quizData.session_id.includes('demo')) {
            console.log('Demo mode: calculating results locally');
            let correctCount = 0;
            
            // Compare user answers with correct answers
            Object.keys(userAnswers).forEach(index => {
                if (userAnswers[index] === quizData.questions[index].answer) {
                    correctCount++;
                }
            });
            
            result = {
                score: correctCount,
                total: quizData.questions.length,
                percentage: (correctCount / quizData.questions.length) * 100
            };
        } else {
            // For real API session, submit to server
            // Prepare user answers for submission
            const userAnswersParam = encodeURIComponent(JSON.stringify(userAnswers));
            
            // Submit the quiz
            const response = await fetch(`${API_URL}/quiz/submit/${quizData.session_id}?user_answers=${userAnswersParam}`);
            
            if (!response.ok) {
                throw new Error('Failed to submit quiz');
            }
            
            result = await response.json();
        }
        
        // Update the results UI
        scorePercentageSpan.textContent = `${Math.round(result.percentage)}%`;
        correctAnswersSpan.textContent = result.score;
        
        // Calculate tokens based on score (10 tokens per correct answer)
        const tokens = result.score * 10;
        tokensEarnedSpan.textContent = tokens;
        
        // Show the results section
        quizQuestionsSection.classList.add('hidden');
        quizResultsSection.classList.remove('hidden');
    } catch (error) {
        console.error('Error submitting quiz:', error);
        alert('Failed to submit quiz. Please try again.');
        submitQuizBtn.disabled = false;
        submitQuizBtn.textContent = 'Submit Quiz';
    }
}

// Fallback for development/testing without the API
function loadDemoQuiz() {
    // This function loads a demo quiz when the API is not available
    console.log('Loading demo quiz for development/testing.');
    
    // Sample quiz data with 15 questions
    quizData = {
        session_id: 'demo_session',
        questions: [
            {
                question: "Which state of matter has a definite shape and volume?",
                options: ["Solid", "Liquid", "Gas", "Plasma"],
                answer: "Solid",
                subject: "Science",
                chapter: "Matter in Our Surroundings",
                difficulty: "easy"
            },
            {
                question: "What is the value of π (pi) up to two decimal places?",
                options: ["3.14", "3.15", "3.16", "3.17"],
                answer: "3.14",
                subject: "Mathematics",
                chapter: "Number Systems",
                difficulty: "medium"
            },
            {
                question: "In which year did the French Revolution begin?",
                options: ["1789", "1776", "1804", "1799"],
                answer: "1789",
                subject: "Social Science",
                chapter: "The French Revolution",
                difficulty: "easy"
            },
            {
                question: "What is the process of conversion of a solid directly into gas called?",
                options: ["Evaporation", "Condensation", "Sublimation", "Melting"],
                answer: "Sublimation",
                subject: "Science",
                chapter: "Matter in Our Surroundings",
                difficulty: "medium"
            },
            {
                question: "Which of the following is an irrational number?",
                options: ["2", "4", "√2", "1"],
                answer: "√2",
                subject: "Mathematics",
                chapter: "Number Systems",
                difficulty: "easy"
            },
            {
                question: "Who was the king of France at the time of the French Revolution?",
                options: ["Louis XIV", "Louis XV", "Louis XVI", "Louis XVII"],
                answer: "Louis XVI",
                subject: "Social Science",
                chapter: "The French Revolution",
                difficulty: "medium"
            },
            {
                question: "At what temperature does water boil at sea level?",
                options: ["90°C", "95°C", "100°C", "105°C"],
                answer: "100°C",
                subject: "Science",
                chapter: "Matter in Our Surroundings",
                difficulty: "hard"
            },
            {
                question: "Simplify: (√2 + √3)²",
                options: ["5 + 2√6", "5 + √6", "5 + 2√3", "5 + 2√2"],
                answer: "5 + 2√6",
                subject: "Mathematics",
                chapter: "Number Systems",
                difficulty: "hard"
            },
            {
                question: "What was the name of the prison stormed by revolutionaries on July 14, 1789?",
                options: ["Versailles", "Bastille", "Tuileries", "Louvre"],
                answer: "Bastille",
                subject: "Social Science",
                chapter: "The French Revolution",
                difficulty: "hard"
            },
            {
                question: "What is the chemical formula for water?",
                options: ["H2O", "CO2", "NaCl", "O2"],
                answer: "H2O",
                subject: "Science",
                chapter: "Chemical Formulas",
                difficulty: "easy"
            },
            {
                question: "What is the square root of 144?",
                options: ["10", "12", "14", "16"],
                answer: "12",
                subject: "Mathematics",
                chapter: "Square Roots",
                difficulty: "easy"
            },
            {
                question: "Who wrote 'Romeo and Juliet'?",
                options: ["Charles Dickens", "William Shakespeare", "Jane Austen", "Mark Twain"],
                answer: "William Shakespeare",
                subject: "English Literature",
                chapter: "Drama",
                difficulty: "easy"
            },
            {
                question: "What is the capital of Japan?",
                options: ["Beijing", "Seoul", "Tokyo", "Bangkok"],
                answer: "Tokyo",
                subject: "Geography",
                chapter: "World Capitals",
                difficulty: "easy"
            },
            {
                question: "Which planet is known as the Red Planet?",
                options: ["Venus", "Jupiter", "Mars", "Mercury"],
                answer: "Mars",
                subject: "Science",
                chapter: "Solar System",
                difficulty: "easy"
            },
            {
                question: "What is the largest organ in the human body?",
                options: ["Heart", "Brain", "Liver", "Skin"],
                answer: "Skin",
                subject: "Biology",
                chapter: "Human Body",
                difficulty: "medium"
            }
        ],
        start_time: Date.now() / 1000
    };
    
    // Set questions
    totalQuestionsSpan.textContent = quizData.questions.length;
    totalQuestionsResultSpan.textContent = quizData.questions.length;
    
    // Hide start screen, show questions
    quizStartSection.classList.add('hidden');
    quizQuestionsSection.classList.remove('hidden');
    
    // Start the timer
    startTimer();
    
    // Load the first question
    loadQuestion(0);
    
    // Reset the begin quiz button
    beginQuizBtn.disabled = false;
    beginQuizBtn.textContent = 'Begin Test';
}

function createModals() {
    // Create login modal
    const loginModal = document.createElement('div');
    loginModal.id = 'login-modal';
    loginModal.className = 'modal';
    loginModal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            <h2>Login</h2>
            <form id="login-form">
                <div class="form-group">
                    <label for="login-email">Email</label>
                    <input type="email" id="login-email" required>
                </div>
                <div class="form-group">
                    <label for="login-password">Password</label>
                    <input type="password" id="login-password" required>
                </div>
                <button type="submit" class="cta-button">Login</button>
            </form>
        </div>
    `;
    document.body.appendChild(loginModal);
    
    // Create signup modal
    const signupModal = document.createElement('div');
    signupModal.id = 'signup-modal';
    signupModal.className = 'modal';
    signupModal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            <h2>Sign Up</h2>
            <form id="signup-form">
                <div class="form-group">
                    <label for="signup-name">Full Name</label>
                    <input type="text" id="signup-name" required>
                </div>
                <div class="form-group">
                    <label for="signup-email">Email</label>
                    <input type="email" id="signup-email" required>
                </div>
                <div class="form-group">
                    <label for="signup-password">Password</label>
                    <input type="password" id="signup-password" required>
                </div>
                <div class="form-group">
                    <label for="signup-confirm">Confirm Password</label>
                    <input type="password" id="signup-confirm" required>
                </div>
                <button type="submit" class="cta-button">Sign Up</button>
            </form>
        </div>
    `;
    document.body.appendChild(signupModal);
    
    // Create study plan modal
    const studyPlanModal = document.createElement('div');
    studyPlanModal.id = 'study-plan-modal';
    studyPlanModal.className = 'modal';
    studyPlanModal.innerHTML = `
        <div class="modal-content study-plan-content">
            <span class="close-modal">&times;</span>
            <h2>Your Personalized Study Plan</h2>
            <div class="study-plan-container">
                <h3>Based on your quiz results, we recommend focusing on:</h3>
                <div id="study-recommendations"></div>
                
                <h3>Weekly Schedule</h3>
                <div class="schedule-container">
                    <div class="schedule-day">
                        <h4>Monday</h4>
                        <ul>
                            <li>Mathematics: 1 hour</li>
                            <li>Science: 45 minutes</li>
                        </ul>
                    </div>
                    <div class="schedule-day">
                        <h4>Tuesday</h4>
                        <ul>
                            <li>Social Science: 1 hour</li>
                            <li>English: 45 minutes</li>
                        </ul>
                    </div>
                    <div class="schedule-day">
                        <h4>Wednesday</h4>
                        <ul>
                            <li>Mathematics: 1 hour</li>
                            <li>Science: 45 minutes</li>
                        </ul>
                    </div>
                    <div class="schedule-day">
                        <h4>Thursday</h4>
                        <ul>
                            <li>Social Science: 1 hour</li>
                            <li>English: 45 minutes</li>
                        </ul>
                    </div>
                    <div class="schedule-day">
                        <h4>Friday</h4>
                        <ul>
                            <li>Mathematics: 1 hour</li>
                            <li>Science: 45 minutes</li>
                        </ul>
                    </div>
                    <div class="schedule-day weekend">
                        <h4>Weekend</h4>
                        <ul>
                            <li>Revision: 2 hours</li>
                            <li>Practice tests: 1 hour</li>
                        </ul>
                    </div>
                </div>
                
                <h3>Recommended Resources</h3>
                <div class="resources-container">
                    <div class="resource-item">
                        <h4>Khan Academy</h4>
                        <p>Free online courses in mathematics, science, and more.</p>
                        <a href="https://www.khanacademy.org/" target="_blank" class="resource-link">Visit Website</a>
                    </div>
                    <div class="resource-item">
                        <h4>Crash Course</h4>
                        <p>Educational YouTube series on various subjects.</p>
                        <a href="https://www.youtube.com/user/crashcourse" target="_blank" class="resource-link">Watch Videos</a>
                    </div>
                    <div class="resource-item">
                        <h4>Quizlet</h4>
                        <p>Flashcards and study tools for various subjects.</p>
                        <a href="https://quizlet.com/" target="_blank" class="resource-link">Practice Now</a>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(studyPlanModal);
    
    // Add event listeners for modal close buttons
    document.querySelectorAll('.close-modal').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    // Add form submission handlers
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('signup-form').addEventListener('submit', handleSignup);
    
    // Add CSS for modals
    const modalStyle = document.createElement('style');
    modalStyle.textContent = `
        .modal {
            display: none;
            position: fixed;
            z-index: 2000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            overflow: auto;
        }
        
        .modal-content {
            background-color: white;
            margin: 10% auto;
            padding: 2rem;
            border-radius: var(--border-radius);
            box-shadow: var(--box-shadow);
            width: 80%;
            max-width: 500px;
            position: relative;
        }
        
        .study-plan-content {
            max-width: 800px;
            max-height: 80vh;
            overflow-y: auto;
        }
        
        .close-modal {
            position: absolute;
            top: 1rem;
            right: 1.5rem;
            font-size: 1.5rem;
            cursor: pointer;
        }
        
        .form-group {
            margin-bottom: 1.5rem;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 600;
        }
        
        .form-group input {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #ddd;
            border-radius: var(--border-radius);
            font-size: 1rem;
        }
        
        .study-plan-container {
            margin-top: 1.5rem;
        }
        
        .schedule-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin: 1.5rem 0;
        }
        
        .schedule-day {
            background: #f9f9f9;
            padding: 1rem;
            border-radius: var(--border-radius);
            border-left: 4px solid var(--primary-color);
        }
        
        .schedule-day.weekend {
            border-left: 4px solid var(--accent-color);
        }
        
        .schedule-day h4 {
            margin-bottom: 0.5rem;
            color: var(--text-color);
        }
        
        .schedule-day ul {
            padding-left: 1.5rem;
        }
        
        .resources-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin: 1.5rem 0;
        }
        
        .resource-item {
            background: white;
            padding: 1.5rem;
            border-radius: var(--border-radius);
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        
        .resource-link {
            display: inline-block;
            margin-top: 1rem;
            padding: 0.5rem 1rem;
            background: var(--gradient-yellow);
            border-radius: 20px;
            color: var(--text-color);
            font-weight: 600;
            text-decoration: none;
        }
        
        #study-recommendations {
            background: rgba(255, 215, 0, 0.1);
            padding: 1rem;
            border-radius: var(--border-radius);
            margin: 1rem 0;
        }
    `;
    document.head.appendChild(modalStyle);
}

function showLoginModal() {
    document.getElementById('login-modal').style.display = 'block';
}

function showSignupModal() {
    document.getElementById('signup-modal').style.display = 'block';
}

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    // In a real app, you'd verify with the server
    // For demo purposes, we'll just set the current user
    currentUser = {
        email: email,
        name: email.split('@')[0]
    };
    
    // Update UI to show logged in state
    updateUserUI();
    
    // Hide the modal
    document.getElementById('login-modal').style.display = 'none';
    
    // Show success message
    alert('Successfully logged in!');
}

function handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirm = document.getElementById('signup-confirm').value;
    
    // Basic validation
    if (password !== confirm) {
        alert('Passwords do not match');
        return;
    }
    
    // In a real app, you'd register with the server
    // For demo purposes, we'll just set the current user
    currentUser = {
        name: name,
        email: email
    };
    
    // Update UI to show logged in state
    updateUserUI();
    
    // Hide the modal
    document.getElementById('signup-modal').style.display = 'none';
    
    // Show success message
    alert('Account created successfully!');
}

function updateUserUI() {
    if (currentUser) {
        // Update auth buttons
        const authButtons = document.querySelector('.auth-buttons');
        authButtons.innerHTML = `
            <div class="user-profile">
                <span class="user-greeting">Welcome, ${currentUser.name}!</span>
                <button class="logout-btn" onclick="handleLogout()">Logout</button>
            </div>
        `;
        
        // Add style for user profile
        const style = document.createElement('style');
        style.textContent = `
            .user-profile {
                display: flex;
                align-items: center;
                gap: 1rem;
            }
            
            .user-greeting {
                font-weight: 600;
            }
            
            .logout-btn {
                padding: 8px 16px;
                background: transparent;
                border: 1px solid var(--primary-color);
                border-radius: 20px;
                cursor: pointer;
            }
        `;
        document.head.appendChild(style);
    }
}

// Make handleLogout available globally
window.handleLogout = function() {
    currentUser = null;
    
    // Restore original auth buttons
    const authButtons = document.querySelector('.auth-buttons');
    authButtons.innerHTML = `
        <button class="login-btn">Login</button>
        <button class="signup-btn">Sign Up</button>
    `;
    
    // Re-attach event listeners
    document.querySelector('.login-btn').addEventListener('click', showLoginModal);
    document.querySelector('.signup-btn').addEventListener('click', showSignupModal);
    
    // Show message
    alert('You have been logged out.');
};

function showStudyPlan() {
    // Generate recommendations based on quiz results
    let recommendations = '';
    
    if (quizData && userAnswers) {
        const incorrectQuestions = [];
        
        // Find questions answered incorrectly
        Object.keys(userAnswers).forEach(index => {
            if (userAnswers[index] !== quizData.questions[index].answer) {
                incorrectQuestions.push(quizData.questions[index]);
            }
        });
        
        // Group by subject
        const subjectGroups = {};
        incorrectQuestions.forEach(q => {
            if (!subjectGroups[q.subject]) {
                subjectGroups[q.subject] = [];
            }
            subjectGroups[q.subject].push(q);
        });
        
        // Create recommendation text
        if (Object.keys(subjectGroups).length > 0) {
            recommendations += '<ul>';
            for (const subject in subjectGroups) {
                const chapters = [...new Set(subjectGroups[subject].map(q => q.chapter))];
                recommendations += `<li><strong>${subject}</strong>: Focus on ${chapters.join(', ')}</li>`;
            }
            recommendations += '</ul>';
        } else {
            recommendations = '<p>Great job! You answered all questions correctly. Continue with the suggested schedule to maintain your knowledge.</p>';
        }
    } else {
        recommendations = '<p>Complete a quiz first to get personalized recommendations.</p>';
    }
    
    // Update the modal with recommendations
    document.getElementById('study-recommendations').innerHTML = recommendations;
    
    // Show the modal
    document.getElementById('study-plan-modal').style.display = 'block';
} 