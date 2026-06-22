// gateway/apiGateway.js
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@as-integrations/express4");

// ===================== EXPRESS =====================
const app = express();
app.use(cors());
app.use(express.json());

// ===================== gRPC CLIENTS =====================
function loadClient(protoPath, pkg, address) {
  const def = protoLoader.loadSync(protoPath, {
    keepCase: true, longs: String, enums: String, defaults: true, oneofs: true
  });
  const proto = grpc.loadPackageDefinition(def)[pkg];
  const ServiceName = Object.keys(proto).find(key => proto[key] && proto[key].service);
  return new proto[ServiceName](address, grpc.credentials.createInsecure());
}

// Hosts default to "localhost" for local/native runs, but can be overridden
// via environment variables (e.g. service names inside Docker Compose).
const STUDENT_HOST = process.env.STUDENT_SERVICE_HOST || "localhost";
const COURSE_HOST = process.env.COURSE_SERVICE_HOST || "localhost";
const ENROLLMENT_HOST = process.env.ENROLLMENT_SERVICE_HOST || "localhost";

const studentClient = loadClient(
  path.join(__dirname, "../student-service/student.proto"),
  "student", `${STUDENT_HOST}:50051`
);
const courseClient = loadClient(
  path.join(__dirname, "../course-service/course.proto"),
  "course", `${COURSE_HOST}:50052`
);
const enrollmentClient = loadClient(
  path.join(__dirname, "../enrollment-service/enrollment.proto"),
  "enrollment", `${ENROLLMENT_HOST}:50053`
);

// ===================== REST — STUDENTS =====================
app.get("/students", (req, res) => {
  studentClient.GetStudents({}, (err, response) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(response.students);
  });
});

app.get("/students/:id", (req, res) => {
  studentClient.GetStudent({ student_id: req.params.id }, (err, response) => {
    if (err) return res.status(404).json({ error: err.message });
    res.json(response.student);
  });
});

app.post("/students", (req, res) => {
  studentClient.CreateStudent(req.body, (err, response) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json(response.student);
  });
});

app.put("/students/:id", (req, res) => {
  studentClient.UpdateStudent(
    { student_id: req.params.id, ...req.body },
    (err, response) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(response.student);
    }
  );
});

app.delete("/students/:id", (req, res) => {
  studentClient.DeleteStudent({ student_id: req.params.id }, (err, response) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: response.success });
  });
});

// ===================== REST — COURSES =====================
app.get("/courses", (req, res) => {
  courseClient.GetCourses({}, (err, response) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(response.courses);
  });
});

app.get("/courses/:id", (req, res) => {
  courseClient.GetCourse({ course_id: req.params.id }, (err, response) => {
    if (err) return res.status(404).json({ error: err.message });
    res.json(response.course);
  });
});

app.post("/courses", (req, res) => {
  courseClient.CreateCourse(req.body, (err, response) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json(response.course);
  });
});

app.put("/courses/:id", (req, res) => {
  courseClient.UpdateCourse(
    { course_id: req.params.id, ...req.body },
    (err, response) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(response.course);
    }
  );
});

app.delete("/courses/:id", (req, res) => {
  courseClient.DeleteCourse({ course_id: req.params.id }, (err, response) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: response.success });
  });
});

// ===================== REST — ENROLLMENTS =====================
app.get("/enrollments", (req, res) => {
  enrollmentClient.GetEnrollments({}, (err, response) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(response.enrollments);
  });
});

app.get("/enrollments/:id", (req, res) => {
  enrollmentClient.GetEnrollment({ enrollment_id: req.params.id }, (err, response) => {
    if (err) return res.status(404).json({ error: err.message });
    res.json(response.enrollment);
  });
});

app.post("/enroll", (req, res) => {
  enrollmentClient.CreateEnrollment(req.body, (err, response) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json(response.enrollment);
  });
});

app.delete("/enrollments/:id", (req, res) => {
  enrollmentClient.DeleteEnrollment(
    { enrollment_id: req.params.id },
    (err, response) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: response.success });
    }
  );
});

// ===================== GRAPHQL =====================
const typeDefs = fs.readFileSync(
  path.join(__dirname, "../graphql/schema.gql"), "utf8"
);
const buildResolvers = require("../graphql/resolvers");

async function startGraphQL() {
  const resolvers = buildResolvers({ studentClient, courseClient, enrollmentClient });
  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();
  app.use("/graphql", expressMiddleware(server));
  console.log("📊 GraphQL ready at http://localhost:3000/graphql");
}

// ===================== START =====================
async function start() {
  await startGraphQL();
  app.listen(3000, () => {
    console.log("🚀 API Gateway running on http://localhost:3000");
  });
}

start().catch(console.error);
