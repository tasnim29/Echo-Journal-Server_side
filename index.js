const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.bcspfgx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const blogsCollection = client.db("blog-website").collection("blogs");

    // add blog
    app.post("/blogs", async (req, res) => {
      const newBlog = req.body;
      const result = await blogsCollection.insertOne(newBlog);
      res.send(result);
    });
    //get 6 blogs in recent blogs
    app.get("/blogs", async (req, res) => {
      const cursor = await blogsCollection.find().limit(6).toArray();
      res.send(cursor);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Welcome to Blog Website");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
