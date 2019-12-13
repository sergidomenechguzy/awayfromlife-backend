process.env.NODE_ENV = "test";

const mongoose = require("mongoose");
const chai = require("chai");
const chaiHttp = require("chai-http");
const app = require("../app");
require("../api/models/Bug");

const Bug = mongoose.model("bugs");
chai.use(chaiHttp);
chai.should();

describe("Bugs", () => {
  beforeEach(async () => {
    await Bug.remove();
  });

  describe("GET /", () => {
    describe("Collection empty", () => {
      it("should GET empty list", () => {
        chai
          .request(app)
          .get("/api/bugs")
          .then(res => {
            res.should.have.status(200);
            res.body.data.should.be.a("array");
            res.body.data.length.should.be.eql(0);
          });
      });
    });

    describe("Collection with entries", () => {
      it("should GET all bugs", () => {
        const bug = new Bug({
          error: 'Läuft gar nicht',
          description: 'Wollte halt was machen aber ging nicht!',
          loggedIn: 2,
          component: "Submit Bug Page",
          email: 'test@test.com'
        })
        chai
          .request(app)
          .get("/api/bugs")
          .then(res => {
            res.should.have.status(200);
            res.body.data.should.be.a("array");
            res.body.data.length.should.be.eql(0);
          });
      });
    });
  });
});
