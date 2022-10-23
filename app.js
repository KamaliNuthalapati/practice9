const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
const bcrypt = require("bcrypt");
app.use(express.json());

const dbPath = path.join(__dirname, "userData.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(6000, () => {
      console.log("Server Running at http://localhost:6000/");
    });
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

app.post("/register/", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(request.body.password, 10);
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === username) {
    response.status = 400;
    response.send("User already exists");
  } else if (password.length < 5) {
    response.status = 400;
    response.send("Password is too short");
  } else {
    const createUserQuery = `
        INSERT INTO 
            user (username,name,password,gender,location)
        VALUES 
        (
            '${username}',
            '${name}',
            '${hashedPassword}',
            '${gender}',
            '${location}'
        );`;
    const dbResponse = await db.run(createUserQuery);
    const newUserId = dbResponse.lastID;
    response.status = 200;
    response.send("User created successfully");
  }
});

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      response.status(200);
      response.send("Login success");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);
  const isPasswordMatched = await bcrypt.compare(oldPassword, dbUser.password);
  if (isPasswordMatched !== true) {
    response.status(400);
    response.send("Invalid current password");
  } else if (newPassword.length < 5) {
    response.status(400);
    response.send("Password is too short");
  } else {
    const hashedPassword = await bcrypt.hash(request.body.newPassword, 10);
    const updatePasswordQuery = `
   UPDATE user 
   SET 
      password = '${newPassword}';`;
    await db.run(updatePasswordQuery);
    response.status(200);
    response.send("Password updated");
  }
});
