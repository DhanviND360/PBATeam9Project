from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import random
import json
import time
import requests
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get Gemini API key from environment variables or set a default for local development
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

app = FastAPI(title="Student Quiz API")

# Add CORS middleware to allow frontend to access the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load questions from JSON file
try:
    with open('questions.json', 'r') as f:
        questions_db = json.load(f)
except FileNotFoundError:
    # Fallback to an empty database if file doesn't exist
    questions_db = {}

class Question(BaseModel):
    question: str
    options: List[str]
    answer: str
    subject: str
    chapter: str
    difficulty: str

class QuizSession(BaseModel):
    session_id: str
    questions: List[Question]
    start_time: float
    duration_seconds: int = 2700  # 45 minutes in seconds

# Store active quiz sessions
active_sessions: Dict[str, QuizSession] = {}

@app.get("/quiz/new", response_model=QuizSession)
def create_quiz(class_name: str = "class_9", num_questions: int = 15):
    """Create a new quiz with randomized questions."""
    if class_name not in questions_db:
        raise HTTPException(status_code=404, detail=f"Class '{class_name}' not found")
    
    subjects = questions_db[class_name]
    all_questions = []
    
    # Collect all available questions
    for subject, chapters in subjects.items():
        for chapter, difficulties in chapters.items():
            for difficulty, questions in difficulties.items():
                for q in questions:
                    all_questions.append(
                        Question(
                            question=q["question"],
                            options=q["options"],
                            answer=q["answer"],
                            subject=subject,
                            chapter=chapter,
                            difficulty=difficulty
                        )
                    )
    
    # Check if we have enough questions
    if len(all_questions) < num_questions:
        raise HTTPException(
            status_code=400, 
            detail=f"Not enough questions available. Requested {num_questions}, but only {len(all_questions)} found."
        )
    
    # Randomly select questions
    selected_questions = random.sample(all_questions, num_questions)
    
    # Create a session ID
    session_id = f"quiz_{int(time.time())}_{random.randint(1000, 9999)}"
    
    # Store the session
    session = QuizSession(
        session_id=session_id,
        questions=selected_questions,
        start_time=time.time()
    )
    active_sessions[session_id] = session
    
    return session

@app.get("/quiz/ai-generated", response_model=QuizSession)
def create_ai_quiz(class_name: str = "class_9", num_questions: int = 15):
    """Create a new quiz with AI-generated questions based on the student's class."""
    
    # Convert class_name format (e.g., class_9) to a more readable format (e.g., Class 9)
    readable_class = class_name.replace("_", " ").title()
    
    # Generate AI questions using Gemini
    ai_questions = generate_quiz_questions(readable_class, num_questions)
    
    # Create a session ID
    session_id = f"ai_quiz_{int(time.time())}_{random.randint(1000, 9999)}"
    
    # Store the session
    session = QuizSession(
        session_id=session_id,
        questions=ai_questions,
        start_time=time.time()
    )
    active_sessions[session_id] = session
    
    return session

@app.get("/quiz/time-remaining/{session_id}")
def get_time_remaining(session_id: str):
    """Get the remaining time for a quiz session."""
    if session_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Quiz session not found")
    
    session = active_sessions[session_id]
    elapsed_time = time.time() - session.start_time
    remaining_time = max(0, session.duration_seconds - elapsed_time)
    
    return {
        "session_id": session_id,
        "remaining_seconds": int(remaining_time),
        "time_expired": remaining_time <= 0
    }

@app.get("/quiz/submit/{session_id}")
def submit_quiz(session_id: str, user_answers: Dict[int, str]):
    """Submit a quiz and get the score."""
    if session_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Quiz session not found")
    
    session = active_sessions[session_id]
    
    # Check if time has expired
    elapsed_time = time.time() - session.start_time
    if elapsed_time > session.duration_seconds:
        return {
            "session_id": session_id,
            "time_expired": True,
            "message": "Quiz time expired",
            "score": 0,
            "total": len(session.questions)
        }
    
    # Calculate score
    correct_answers = 0
    total_questions = len(session.questions)
    
    for idx, answer in user_answers.items():
        if idx < total_questions and session.questions[idx].answer == answer:
            correct_answers += 1
    
    # Clean up the session
    active_sessions.pop(session_id, None)
    
    return {
        "session_id": session_id,
        "time_expired": False,
        "score": correct_answers,
        "total": total_questions,
        "percentage": (correct_answers / total_questions) * 100 if total_questions > 0 else 0
    }

# Function to generate quiz questions using Gemini API
def generate_quiz_questions(class_name: str, num_questions: int = 15) -> List[Question]:
    """Generate quiz questions using Gemini AI based on the student's class."""
    
    # If API key is not available, return demo questions
    if not GEMINI_API_KEY:
        print("Gemini API key not found. Using demo questions.")
        return generate_demo_questions(num_questions)
    
    try:
        # Define the main subjects for different classes
        subjects_by_class = {
            "Class 9": ["Mathematics", "Science", "Social Science", "English", "Hindi"],
            "Class 10": ["Mathematics", "Science", "Social Science", "English", "Hindi"],
            "Class 11": ["Physics", "Chemistry", "Mathematics", "Biology", "English"],
            "Class 12": ["Physics", "Chemistry", "Mathematics", "Biology", "English"]
        }
        
        # Get subjects for the specified class or default to Class 9 subjects
        subjects = subjects_by_class.get(class_name, subjects_by_class["Class 9"])
        
        # Define difficulty levels
        difficulties = ["easy", "medium", "hard"]
        
        # Calculate how many questions to generate per subject and difficulty
        questions_per_subject = num_questions // len(subjects)
        remaining_questions = num_questions % len(subjects)
        
        # List to store generated questions
        generated_questions = []
        
        for subject in subjects:
            # Calculate how many questions for this subject (distribute remaining questions)
            subject_questions = questions_per_subject
            if remaining_questions > 0:
                subject_questions += 1
                remaining_questions -= 1
                
            # Calculate questions per difficulty level
            easy_count = subject_questions // 3 + (1 if subject_questions % 3 > 0 else 0)
            medium_count = subject_questions // 3 + (1 if subject_questions % 3 > 1 else 0)
            hard_count = subject_questions - easy_count - medium_count
            
            difficulty_counts = {
                "easy": easy_count,
                "medium": medium_count,
                "hard": hard_count
            }
            
            # Generate questions for each difficulty level
            for difficulty, count in difficulty_counts.items():
                if count > 0:
                    prompt = f"""
                    Generate {count} multiple-choice questions for {class_name} students on the subject {subject}. 
                    The difficulty level should be {difficulty}.
                    
                    Each question must have exactly 4 options with ONLY ONE correct answer.
                    
                    Format the output as a valid JSON array where each question is an object with these fields:
                    - question: The question text
                    - options: An array of 4 options
                    - answer: The correct answer (must be one of the options)
                    - subject: "{subject}"
                    - chapter: The chapter/topic name
                    - difficulty: "{difficulty}"
                    
                    Make sure all questions are factually correct and appropriate for {class_name} students.
                    Ensure a good mix of topics within the subject.
                    """
                    
                    # Call Gemini API to generate questions
                    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent"
                    headers = {
                        "Content-Type": "application/json",
                        "x-goog-api-key": GEMINI_API_KEY
                    }
                    data = {
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {
                            "temperature": 0.7,
                            "topK": 40,
                            "topP": 0.95,
                            "maxOutputTokens": 8192
                        }
                    }
                    
                    response = requests.post(url, headers=headers, json=data)
                    response.raise_for_status()
                    response_json = response.json()
                    
                    # Extract the generated text
                    generated_text = response_json["candidates"][0]["content"]["parts"][0]["text"]
                    
                    # Extract JSON from the generated text - look for first [ and last ]
                    json_start = generated_text.find("[")
                    json_end = generated_text.rfind("]") + 1
                    
                    if json_start != -1 and json_end != -1:
                        json_str = generated_text[json_start:json_end]
                        questions_data = json.loads(json_str)
                        
                        # Convert to Question objects
                        for q_data in questions_data:
                            # Ensure all required fields are present
                            if all(key in q_data for key in ["question", "options", "answer", "subject", "chapter", "difficulty"]):
                                # Validate the answer is in options
                                if q_data["answer"] in q_data["options"]:
                                    question = Question(
                                        question=q_data["question"],
                                        options=q_data["options"],
                                        answer=q_data["answer"],
                                        subject=q_data["subject"],
                                        chapter=q_data["chapter"],
                                        difficulty=q_data["difficulty"]
                                    )
                                    generated_questions.append(question)
        
        # If we don't have enough questions, generate some generic ones to fill
        if len(generated_questions) < num_questions:
            remaining = num_questions - len(generated_questions)
            generated_questions.extend(generate_demo_questions(remaining))
            
        # Shuffle questions to mix subjects and difficulties
        random.shuffle(generated_questions)
        
        # Limit to the requested number of questions
        return generated_questions[:num_questions]
    
    except Exception as e:
        print(f"Error generating questions with Gemini: {e}")
        # Fallback to demo questions
        return generate_demo_questions(num_questions)

def generate_demo_questions(num_questions: int = 15) -> List[Question]:
    """Generate demo questions when API is not available."""
    demo_questions = [
        Question(
            question="Which state of matter has a definite shape and volume?",
            options=["Solid", "Liquid", "Gas", "Plasma"],
            answer="Solid",
            subject="Science",
            chapter="Matter in Our Surroundings",
            difficulty="easy"
        ),
        Question(
            question="What is the value of π (pi) up to two decimal places?",
            options=["3.14", "3.15", "3.16", "3.17"],
            answer="3.14",
            subject="Mathematics",
            chapter="Number Systems",
            difficulty="medium"
        ),
        Question(
            question="In which year did the French Revolution begin?",
            options=["1789", "1776", "1804", "1799"],
            answer="1789",
            subject="Social Science",
            chapter="The French Revolution",
            difficulty="easy"
        ),
        Question(
            question="What is the process of conversion of a solid directly into gas called?",
            options=["Evaporation", "Condensation", "Sublimation", "Melting"],
            answer="Sublimation",
            subject="Science",
            chapter="Matter in Our Surroundings",
            difficulty="medium"
        ),
        Question(
            question="Which of the following is an irrational number?",
            options=["2", "4", "√2", "1"],
            answer="√2",
            subject="Mathematics",
            chapter="Number Systems",
            difficulty="easy"
        ),
        Question(
            question="Who was the king of France at the time of the French Revolution?",
            options=["Louis XIV", "Louis XV", "Louis XVI", "Louis XVII"],
            answer="Louis XVI",
            subject="Social Science",
            chapter="The French Revolution",
            difficulty="medium"
        ),
        Question(
            question="At what temperature does water boil at sea level?",
            options=["90°C", "95°C", "100°C", "105°C"],
            answer="100°C",
            subject="Science",
            chapter="Matter in Our Surroundings",
            difficulty="hard"
        ),
        Question(
            question="Simplify: (√2 + √3)²",
            options=["5 + 2√6", "5 + √6", "5 + 2√3", "5 + 2√2"],
            answer="5 + 2√6",
            subject="Mathematics",
            chapter="Number Systems",
            difficulty="hard"
        ),
        Question(
            question="What was the name of the prison stormed by revolutionaries on July 14, 1789?",
            options=["Versailles", "Bastille", "Tuileries", "Louvre"],
            answer="Bastille",
            subject="Social Science",
            chapter="The French Revolution",
            difficulty="hard"
        ),
        Question(
            question="What is the chemical formula for water?",
            options=["H2O", "CO2", "NaCl", "O2"],
            answer="H2O",
            subject="Science",
            chapter="Chemical Formulas",
            difficulty="easy"
        ),
        Question(
            question="What is the square root of 144?",
            options=["10", "12", "14", "16"],
            answer="12",
            subject="Mathematics",
            chapter="Square Roots",
            difficulty="easy"
        ),
        Question(
            question="Who wrote 'Romeo and Juliet'?",
            options=["Charles Dickens", "William Shakespeare", "Jane Austen", "Mark Twain"],
            answer="William Shakespeare",
            subject="English Literature",
            chapter="Drama",
            difficulty="easy"
        ),
        Question(
            question="What is the capital of Japan?",
            options=["Beijing", "Seoul", "Tokyo", "Bangkok"],
            answer="Tokyo",
            subject="Geography",
            chapter="World Capitals",
            difficulty="easy"
        ),
        Question(
            question="Which planet is known as the Red Planet?",
            options=["Venus", "Jupiter", "Mars", "Mercury"],
            answer="Mars",
            subject="Science",
            chapter="Solar System",
            difficulty="easy"
        ),
        Question(
            question="What is the largest organ in the human body?",
            options=["Heart", "Brain", "Liver", "Skin"],
            answer="Skin",
            subject="Biology",
            chapter="Human Body",
            difficulty="medium"
        )
    ]
    
    # If we need more questions than we have in our demo list, repeat some
    if num_questions > len(demo_questions):
        # Repeat questions as needed
        return demo_questions * (num_questions // len(demo_questions) + 1)[:num_questions]
    
    # Otherwise, return a random subset
    return random.sample(demo_questions, num_questions)

# Legacy endpoint for compatibility
@app.get("/quiz", response_model=List[Question])
def get_quiz(class_name: str = "class_9"):
    """Legacy endpoint that returns 15 questions."""
    if class_name not in questions_db:
        raise HTTPException(status_code=404, detail="Class not found")

    subjects = questions_db[class_name]
    all_questions = []
    
    # Collect all available questions
    for subject, chapters in subjects.items():
        for chapter, difficulties in chapters.items():
            for difficulty, questions in difficulties.items():
                for q in questions:
                    all_questions.append(
                        Question(
                            question=q["question"],
                            options=q["options"],
                            answer=q["answer"],
                            subject=subject,
                            chapter=chapter,
                            difficulty=difficulty
                        )
                    )
    
    # Randomly select questions, at least 15 if available
    num_questions = min(15, len(all_questions))
    selected_questions = random.sample(all_questions, num_questions)
    
    return selected_questions

@app.get("/")
def read_root():
    return {"message": "Welcome to the Quiz API for students!"}
