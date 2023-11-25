const express = require("express");
require("dotenv").config();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.o2tazeo.mongodb.net/?retryWrites=true&w=majority`;
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
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const boidatasCollection = client.db("biodataDb").collection("boidatas");

    // all boidata  relented data

    app.get("/boidatas", async (req, res) => {
      try {
        const result = await boidatasCollection.find().toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: " Server Error" });
      }
    });

    app.get("/biodatas/:id", async (req, res) => {
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
        res.status(500).send("Internal Server Error");
      }
    });

    app.get("/biodatas/filter", async (req, res) => {
      try {
        const { minAge, maxAge, biodataType, division } = req.query;

        //  received division
        //console.log('division:', division);

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

        //  filter
        // console.log(' filter:', filter);

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

    // Send a ping to confirm a successful connection
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
  res.send("Boidata running on port");
});

app.listen(port, () => {
  console.log(`Boidata app listening on port ${port}`);
});
