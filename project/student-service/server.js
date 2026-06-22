// student-service/server.js
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// ===================== DATABASE =====================
const db = new sqlite3.Database(
  path.join(__dirname, "students.db")
);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS students (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      name  TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE
    )
  `);
});

// ===================== PROTO =====================
const packageDefinition = protoLoader.loadSync(
  path.join(__dirname, "student.proto"),
  { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true }
);
const studentProto = grpc.loadPackageDefinition(packageDefinition).student;

// ===================== SERVICE IMPL =====================
const studentService = {

  GetStudent(call, callback) {
    db.get(
      "SELECT * FROM students WHERE id = ?",
      [call.request.student_id],
      (err, row) => {
        if (err) return callback(err);
        if (!row) return callback({ code: grpc.status.NOT_FOUND, message: "Student not found" });
        callback(null, { student: { id: row.id.toString(), name: row.name, email: row.email } });
      }
    );
  },

  GetStudents(call, callback) {
    db.all("SELECT * FROM students", [], (err, rows) => {
      if (err) return callback(err);
      callback(null, {
        students: rows.map(r => ({ id: r.id.toString(), name: r.name, email: r.email }))
      });
    });
  },

  CreateStudent(call, callback) {
    const { name, email } = call.request;
    db.run(
      "INSERT INTO students (name, email) VALUES (?, ?)",
      [name, email],
      function (err) {
        if (err) return callback(err);
        callback(null, { student: { id: this.lastID.toString(), name, email } });
      }
    );
  },

  UpdateStudent(call, callback) {
    const { student_id, name, email } = call.request;
    db.run(
      "UPDATE students SET name = ?, email = ? WHERE id = ?",
      [name, email, student_id],
      function (err) {
        if (err) return callback(err);
        if (this.changes === 0)
          return callback({ code: grpc.status.NOT_FOUND, message: "Student not found" });
        callback(null, { student: { id: student_id, name, email } });
      }
    );
  },

  DeleteStudent(call, callback) {
    db.run(
      "DELETE FROM students WHERE id = ?",
      [call.request.student_id],
      function (err) {
        if (err) return callback(err);
        callback(null, { success: this.changes > 0 });
      }
    );
  }
};

// ===================== START SERVER =====================
const server = new grpc.Server();
server.addService(studentProto.StudentService.service, studentService);
server.bindAsync(
  "0.0.0.0:50051",
  grpc.ServerCredentials.createInsecure(),
  (err, port) => {
    if (err) { console.error("Failed to bind:", err); return; }
    console.log(`✅ Student Service running on port ${port}`);
  }
);
