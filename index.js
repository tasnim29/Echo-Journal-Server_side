const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 3000;

// firebase admin
const admin = require("firebase-admin");
const decoded = Buffer.from(process.env.FB_SERVICE_KEY, "base64").toString(
  "utf-8"
);
// console.log(process.env.FB_SERVICE_KEY.length);
// console.log(decoded);
const serviceAccount = JSON.parse(decoded);

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

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// jwt middleware
const verifyJWT = async (req, res, next) => {
  const authHeader = req.headers?.authorization;
  // check if token available
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
  const token = authHeader.split(" ")[1];

  // check if token is valid
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.decoded = decoded;
    console.log("decoded token", decoded);

    next();
  } catch (error) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
  // console.log(token);
};

async function run() {
  try {
    // await client.connect();

    const blogsCollection = client.db("blog-website").collection("blogs");
    const wishlistsCollection = client
      .db("blog-website")
      .collection("wishlist");
    const commentsCollection = client.db("blog-website").collection("comments");

    // add blog(Only authenticated users can add a blog )
    app.post("/blogs", verifyJWT, async (req, res) => {
      const newBlog = req.body;
      // console.log("New blog received:", newBlog);
      // console.log("Decoded user email:", req.decoded?.email);
      newBlog.email = req.decoded.email;
      console.log("New blog with email received:", newBlog);
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

    // top 10 blogs for featured blogs
    app.get("/topBlogs", async (req, res) => {
      const blogs = await blogsCollection.find({}).toArray();
      const topBlogs = blogs
        .map((blog) => ({
          ...blog,
          wordCount: blog.long?.trim().split(/\s+/).length || 0,
        }))
        .sort((a, b) => b.wordCount - a.wordCount)
        .slice(0, 10);

      res.json(topBlogs);
    });
    // update blog
    app.put("/blogs/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedBlog = req.body;
      const options = { upsert: true };
      const update = { $set: updatedBlog };
      const result = await blogsCollection.updateOne(filter, update, options);
      res.send(result);
    });
    // add wishlist
    app.post("/wishlist/:blogId", async (req, res) => {
      const id = req.params.blogId;
      const wishlistData = req.body;
      console.log(wishlistData);
      const result = await wishlistsCollection.insertOne(wishlistData);
      res.send(result);
    });

    // get all wishlist by user email(applied jwt)
    app.get("/myWishlist/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      console.log("this is", email, req.decoded.email);

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
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

    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
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
