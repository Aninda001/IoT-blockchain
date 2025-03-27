import express from "express";
import fetch from "node-fetch";
const app = express();
const port = 10000;

// Middleware to parse text bodies
app.use(express.json());

// Root route (GET /)
app.get("/", (req, res) => {
    res.status(200).send("OK");
});

// POST /base route
app.post("/base", async (req, res) => {
    try {
        const body = req.body;
        await fetch("http://localhost:10001/msg", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        console.log(body);
        res.status(200).send("200 Ok");
    } catch (error) {
        console.error("Error in /base:", error);
        res.status(500).send("Internal Server Error");
    }
});

// POST /iot route
app.post("/iot", async (req, res) => {
    try {
        const body = req.body;
        console.log(body);
        await fetch("http://localhost:9999/msg", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        res.status(200).send("200 Ok");
    } catch (error) {
        console.error("Error in /iot:", error);
        res.status(500).send("Internal Server Error");
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
