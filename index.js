const express = require("express");
require("dotenv").config();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.o2tazeo.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // await client.connect();
    const usersCollection = client.db("biodataDb").collection("users");
    const boidatasCollection = client.db("biodataDb").collection("boidatas");
    const favoritesCollection = client.db("biodataDb").collection("favorites");

    // favorites

    app.post("/favorites", async (req, res) => {
      const item = req.body;
      const result = await favoritesCollection.insertOne(item);
      res.send(result);
    });
    

    app.get("/favorites", async (req, res) => {
      try {
        const result = await favoritesCollection.find().toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Server Error" });
      }
    });

    // jwt related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "5h",
      });
      res.send({ token });
    });

    // middleware

    const verifyToken = (req, res, next) => {
      // console.log("inside verify token", req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" });
      }

      const token = req.headers.authorization.split(" ")[1];

      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorized access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // verify  admin

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    // user api

    // make admin

    app.patch(
      "/users/admin/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };

        const updateDoc = {
          $set: {
            role: "admin",
          },
        };
        const result = await usersCollection.updateOne(filter, updateDoc);
        res.send(result);
      }
    );

    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      //console.log(req.headers);
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    /// get admin

    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    app.post("/users", async (req, res) => {
      const user = req.body;

      // email checking if user exits
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user Already exits", insertedId: null });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.get("/boidatas", async (req, res) => {
      try {
        const result = await boidatasCollection.find().toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Server Error" });
      }
    });

    app.get("/boidatas/:id", async (req, res) => {
      const id = req.params.id;

      const query = { _id: new ObjectId(id) };
      const result = await boidatasCollection.findOne(query);

      res.send(result);
    });

    // filter
    app.get("/biodatas/filter", async (req, res) => {
      try {
        const { minAge, maxAge, biodataType, division } = req.query;

        const filter = {};
        if (minAge && maxAge) {
          filter.age = { $gte: parseInt(minAge), $lte: parseInt(maxAge) };
        }
        if (biodataType) {
          filter.type = biodataType;
        }
        if (division) {
          filter.division = division;
        }

        const filteredBiodata = await boidatasCollection
          .find(filter)
          .limit(20)
          .toArray();
        res.send(filteredBiodata);
      } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Server Error" });
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Close the MongoDB connection when you finish
    // await client.close();
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Boidata running on port");
});

app.listen(port, () => {
  console.log(`Boidata app listening on port ${port}`);
});
