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
    const boidatasCollection = client.db("biodataDb").collection("boidatas");
    const usersCollection = client.db("biodataDb").collection("users");

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
        console.log("inside verify token", req.headers.authorization);
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

    // user api

    // make admin

    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };

      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.get("/users",verifyToken, async (req, res) => {
      //console.log(req.headers);
      const result = await usersCollection.find().toArray();
      res.send(result);
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

    app.get("/biodatas/id/:id", async (req, res) => {
      const id = req.params.id;

      try {
        const query = { _id: new ObjectId(id) };
        const result = await boidatasCollection.findOne(query);

        if (!result) {
          res.status(404).send("Biodata not found");
          return;
        }

        res.send(result);
      } catch (error) {
        console.error("Error fetching biodata:", error);
        res.status(500).send("Server Error");
      }
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
