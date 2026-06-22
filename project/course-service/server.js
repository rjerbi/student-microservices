// course-service/server.js
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// ===================== DATABASE =====================
const db = new sqlite3.Database(
  path.join(__dirname, "courses.db")
);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS courses (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT NOT NULL,
      description TEXT
    )
  `);
});

// ===================== PROTO =====================
const packageDefinition = protoLoader.loadSync(
  path.join(__dirname, "course.proto"),
  { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true }
);
const courseProto = grpc.loadPackageDefinition(packageDefinition).course;

// ===================== SERVICE IMPL =====================
const courseService = {

  GetCourse(call, callback) {
    db.get(
      "SELECT * FROM courses WHERE id = ?",
      [call.request.course_id],
      (err, row) => {
        if (err) return callback(err);
        if (!row) return callback({ code: grpc.status.NOT_FOUND, message: "Course not found" });
        callback(null, {
          course: { id: row.id.toString(), title: row.title, description: row.description }
        });
      }
    );
  },

  GetCourses(call, callback) {
    db.all("SELECT * FROM courses", [], (err, rows) => {
      if (err) return callback(err);
      callback(null, {
        courses: rows.map(c => ({ id: c.id.toString(), title: c.title, description: c.description }))
      });
    });
  },

  CreateCourse(call, callback) {
    const { title, description } = call.request;
    db.run(
      "INSERT INTO courses (title, description) VALUES (?, ?)",
      [title, description],
      function (err) {
        if (err) return callback(err);
        callback(null, { course: { id: this.lastID.toString(), title, description } });
      }
    );
  },

  UpdateCourse(call, callback) {
    const { course_id, title, description } = call.request;
    db.run(
      "UPDATE courses SET title = ?, description = ? WHERE id = ?",
      [title, description, course_id],
      function (err) {
        if (err) return callback(err);
        if (this.changes === 0)
          return callback({ code: grpc.status.NOT_FOUND, message: "Course not found" });
        callback(null, { course: { id: course_id, title, description } });
      }
    );
  },

  DeleteCourse(call, callback) {
    db.run(
      "DELETE FROM courses WHERE id = ?",
      [call.request.course_id],
      function (err) {
        if (err) return callback(err);
        callback(null, { success: this.changes > 0 });
      }
    );
  }
};

// ===================== START SERVER =====================
const server = new grpc.Server();
server.addService(courseProto.CourseService.service, courseService);
server.bindAsync(
  "0.0.0.0:50052",
  grpc.ServerCredentials.createInsecure(),
  (err, port) => {
    if (err) { console.error("Failed to bind:", err); return; }
    console.log(`✅ Course Service running on port ${port}`);
  }
);
