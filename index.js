const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
    const wishlistsCollection = client
      .db("blog-website")
      .collection("wishlist");
    const commentsCollection = client.db("blog-website").collection("comments");

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
    // get blogs by id for blog details page
    app.get("/blogs/:id", async (req, res) => {
      const id = req.params.id;
      const cursor = { _id: new ObjectId(id) };
      const result = await blogsCollection.findOne(cursor);
      res.send(result);
    });
    //get all blogs in  all blogs page
    app.get("/allBlogs", async (req, res) => {
      const { searchParams, category } = req.query;
      let query = {};
      if (searchParams) {
        query.title = { $regex: searchParams, $options: "i" };
      }

      if (category) {
        query.category = category;
      }
      const cursor = await blogsCollection.find(query).toArray();
      res.send(cursor);
    });
    // add wishlist
    app.post("/wishlist/:blogId", async (req, res) => {
      const id = req.params.blogId;
      const wishlistData = req.body;
      console.log(wishlistData);
      const result = await wishlistsCollection.insertOne(wishlistData);
      res.send(result);
    });
    // get all wishlist by user email
    app.get("/myWishlist/:email", async (req, res) => {
      const email = req.params.email;
      const filter = {
        userEmail: email,
      };
      const allWishlist = await wishlistsCollection.find(filter).toArray();

      for (const wishlist of allWishlist) {
        const wishlistId = wishlist.blogId;
        const cursor = { _id: new ObjectId(wishlistId) };
        const fullBlogData = await blogsCollection.findOne(cursor);

        wishlist.title = fullBlogData.title;
        wishlist.address = fullBlogData.address;
        wishlist.category = fullBlogData.category;
        wishlist.name = fullBlogData.name;
      }
      res.send(allWishlist);
    });
    // add comments
    app.post("/comments/:blogId", async (req, res) => {
      const id = req.params.blogId;
      const commentsData = req.body;
      console.log(commentsData);
      const result = await commentsCollection.insertOne(commentsData);
      res.send(result);
    });
    // get comments for the specific blog
    app.get("/comments/:blogId", async (req, res) => {
      const blogId = req.params.blogId;
      const filter = {
        blogId: blogId,
      };
      const result = await commentsCollection.find(filter).toArray();
      res.send(result);
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
