# Tell me what you are doing

## Overview
The Tell me what you are doing is a simple Electron application designed for macOS that prompts users every 15 minutes to input what they are working on. Idea came from a podcast where Alex Hormozi shares a very simple productivy tactic: write down what you have been working on every 15 minutes. At the end of the day, take a look at it and see if you have worked on important things or not.

## How did I build it?
Using github copilot and Claude 3.7 Sonnet Thinking. All new code and changes comes from prompting and asking copilot to do it.

## Features
- Popup every 15 minutes with a textarea for text input.
- Save inputted text to a local SQLite database.
- View all saved texts in a table format with datetime and text.
- Create a to-do list.
- Simple and user-friendly interface.

## Installation
1. Clone the repository:
   ```
   git clone git@github.com:murilobd/tell-me-what-you-are-doing.git
   cd tell-me-what-you-are-doing
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Build the application:
   ```
   npm run build
   ```

4. Run the application:
   ```
   npm start
   ```

## Usage
- The application will show a popup every 15 minutes.
- Enter what did in those 15 minutes window.
- To view all saved texts, navigate to the history view.

## License
This project is licensed under the MIT License. See the LICENSE file for details.