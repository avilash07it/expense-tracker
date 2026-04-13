## About the website :
** "KoinTrackr" ** A full-stack web app to track daily spending with category breakdowns and spending insights, all with a clean dark-mode UI

## Tech Stack used to build this :
- Database -> MySQL
- Backend -> Node.js and Express
- Frontend -> Html, CSS and JavaScript

## Features :
- User Register and LogIn
- Add expenses (with date, category, description and payment method)
- Filter by category and date
- Sort by amount
- Edit and Delete expenses
- Viewing expenditure summary (total expense, average expense and category-wise breakdown)

## Project Structure :

expense_tracker
    |_ frontend
        |_ index.html
        |_ expense.js
        |_ report.html
        |_ report.js
        |_ register.html
        |_ register.js
    |_ node_modules
    |_ db.js
    |_ server.js
    |_ package.json
    |_ package-lock.json

## Setup and Run Instructions :
1. Clone this repository.
    ```
    git clone <your-repo-url>
    cd expense_tracker
    ```
2. Run `npm init -y`
3. Run `npm install express mysql2 dotenv`.
4. Create a `.env` file with your DB credentials (see `.env.example`)
5. Import the SQL file 
```mysql -u root -p < schema.sql```
6. Run `node server.js`
7. Open http://localhost:3000/ 
8. Register then LogIn