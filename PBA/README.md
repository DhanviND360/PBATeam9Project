# Paratpar AI - Student Learning Platform

An educational platform designed to help students learn effectively without distractions. The platform includes an AI-driven learning system that monitors progress and adapts study plans based on student performance.

## AI-Powered Quiz Generation Feature

The platform now includes an exciting new feature: AI-generated quizzes using Google's Gemini API! This allows the system to create personalized quiz questions based on the student's class level, covering a variety of subjects with different difficulty levels.

### Setting Up the Gemini API

To enable AI-generated quizzes:

1. Get a Gemini API key from [Google AI Studio](https://ai.google.dev/).
2. Create a `.env` file in the project root with the following content:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
3. Replace `your_gemini_api_key_here` with your actual API key.

If the API key is not provided, the system will fall back to using pre-defined demo questions.

### Running the Application

1. Install the required dependencies:
   ```
   pip install -r requirements.txt
   ```

2. Start the backend API server:
   ```
   python -m uvicorn quiz_api:app --reload
   ```

3. Open `index.html` in your browser to access the platform.

### Quiz Generation Process

When a student selects their class and begins a test:

1. The system sends a request to the Gemini AI model to generate questions specific to that class level.
2. Questions are generated across different subjects (Mathematics, Science, Social Science, etc.) with varying difficulty levels (easy, medium, hard).
3. The AI ensures each question has exactly 4 options with one correct answer.
4. If the AI generation fails for any reason, the system falls back to pre-defined questions.

### Features:

- 15 questions per test, distributed across subjects
- Varied difficulty levels
- Real-time timer and tracking
- Immediate feedback on quiz completion
- Token rewards based on performance

Enjoy the enhanced learning experience with AI-generated quizzes!

## Original Platform Features

- **Entrance Assessment Quiz**: 15 questions from various subjects with a 45-minute time limit
- **AI-Driven Learning**: Personalized study plans based on assessment results
- **Distraction-Free Learning**: Focus-enhancing environment
- **Token Reward System**: Earn tokens for completing tasks and exchange for rewards
- **Progress Tracking**: Monitor improvement with analytics

## Tech Stack

- **Backend**: FastAPI (Python)
- **Frontend**: HTML, CSS, JavaScript
- **Data Storage**: JSON

## Getting Started

### Prerequisites

- Python 3.7+
- pip (Python package manager)

### Installation

1. Clone this repository to your local machine

2. Install the required Python packages:
   ```bash
   pip install fastapi uvicorn pydantic
   ```

3. Ensure you have the `questions.json` file in the root directory (sample provided)

### Running the Application

1. Start the FastAPI backend server:
   ```bash
   uvicorn quiz_api:app --reload
   ```
   This will start the server at http://localhost:8000

2. Open the `index.html` file in your web browser or serve it using a simple HTTP server:
   ```bash
   # Using Python's built-in HTTP server
   python -m http.server
   ```
   Then visit http://localhost:8000 in your browser

### API Endpoints

- **GET /quiz/new**: Creates a new quiz session with randomized questions
- **GET /quiz/time-remaining/{session_id}**: Checks remaining time for a quiz session
- **GET /quiz/submit/{session_id}**: Submits answers and calculates score
- **GET /quiz**: Legacy endpoint that returns quiz questions

## Project Structure

```
/
│── quiz_api.py         # FastAPI backend
│── questions.json      # Quiz questions database
│── index.html          # Main HTML file
│── styles.css          # CSS styles
│── script.js           # Frontend JavaScript
│── README.md           # This file
```

## Customizing Questions

The quiz questions are stored in `questions.json`. To add more questions, follow the structure below:

```json
{
  "class_9": {
    "subject": {
      "chapter": {
        "easy": [
          {
            "question": "Question text?",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "answer": "Option A",
            "subject": "Subject Name",
            "chapter": "Chapter Name",
            "difficulty": "easy"
          }
        ]
      }
    }
  }
}
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Future Enhancements

- User authentication system
- More detailed analytics
- Integration with popular educational content
- Mobile application
- Gamification elements 