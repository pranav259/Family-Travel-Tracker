import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  // connecting the db to the site
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "123456",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1; //default userid

let users = []; //no user by default
async function getCurrentUser() {
  //get the list of all users and select the first one
  const result = await db.query("select * from users");
  users = result.rows;
  return users.find((u) => u.id == currentUserId);
}
async function checkVisisted() {
  const result = await db.query(
    "select country_code from visited_countries join users on users.id = user_id where user_id = $1", //select the countries of the current User which is input by the ejs file
    [currentUserId],
  );
  let countries = []; //populate the countries from the list of countries provided by the db query
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}
app.get("/", async (req, res) => {
  //default landing page of the website
  const countries = await checkVisisted(); //countries loaded in the variable
  const currentUser = await getCurrentUser(); // user loaded in the variable
  res.render("index.ejs", {
    // rendering the website with these variables
    countries: countries,
    total: countries.length,
    users: users,
    color: currentUser.color,
  });
});
app.post("/add", async (req, res) => {
  const user = await getCurrentUser();
  const input = req.body["country"];
  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE (country_name) like '%' || $1 || '%';",
      [input],
    );
    const data = result.rows[0];
    const countryCode = data.country_code;
    try {
      await db.query(
        "insert into visited_countries (country_code, user_id) values ($1, $2)",
        [countryCode, currentUserId],
      );
      res.redirect("/");
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
});
app.post("/user", async (req, res) => {
  if (req.body.add == "new") {
    res.render("new.ejs");
  } else {
    currentUserId = req.body.user;
    res.redirect("/");
  }
});

app.post("/new", async (req, res) => {
  const name = req.body.name;
  const color = req.body.color;
  const result = await db.query(
    "insert into users(name, color) values($1,$2) returning *",
    [name, color],
  );
  const id = result.rows[0].id;
  currentUserId = id;
  res.redirect("/");
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
