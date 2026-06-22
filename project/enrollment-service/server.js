// enrollment-service/server.js
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");
const { sendEnrollmentEvent } = require("../kafka/producer");

// ===================== IN-MEMORY STORE =====================
// (No separate DB for enrollment — uses in-memory + Kafka event)
let enrollments = [];

// ===================== PROTO =====================
const packageDefinition = protoLoader.loadSync(
  path.join(__dirname, "enrollment.proto"),
  { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true }
);
const enrollmentProto = grpc.loadPackageDefinition(packageDefinition).enrollment;

// ===================== SERVICE IMPL =====================
const enrollmentService = {

  GetEnrollment(call, callback) {
    const enrollment = enrollments.find(e => e.id === call.request.enrollment_id);
    if (!enrollment)
      return callback({ code: grpc.status.NOT_FOUND, message: "Enrollment not found" });
    callback(null, { enrollment });
  },

  GetEnrollments(call, callback) {
    callback(null, { enrollments });
  },

  async CreateEnrollment(call, callback) {
    const { studentId, courseId } = call.request;
    const enrollment = {
      id: Date.now().toString(),
      studentId,
      courseId
    };
    enrollments.push(enrollment);

    // Fire Kafka event asynchronously
    await sendEnrollmentEvent(enrollment);

    callback(null, { enrollment });
  },

  DeleteEnrollment(call, callback) {
    const idx = enrollments.findIndex(e => e.id === call.request.enrollment_id);
    if (idx === -1)
      return callback({ code: grpc.status.NOT_FOUND, message: "Enrollment not found" });
    enrollments.splice(idx, 1);
    callback(null, { success: true });
  }
};

// ===================== START SERVER =====================
const server = new grpc.Server();
server.addService(enrollmentProto.EnrollmentService.service, enrollmentService);
server.bindAsync(
  "0.0.0.0:50053",
  grpc.ServerCredentials.createInsecure(),
  (err, port) => {
    if (err) { console.error("Failed to bind:", err); return; }
    console.log(`✅ Enrollment Service running on port ${port}`);
  }
);
