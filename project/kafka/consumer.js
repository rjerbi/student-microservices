// kafka/consumer.js
const { Kafka } = require("kafkajs");

// Kafka 4.x — KRaft mode, no Zookeeper
// KAFKA_BROKER can be overridden via env (e.g. "kafka:9092" inside Docker)
const kafka = new Kafka({
  clientId: "notification-service",
  brokers: [process.env.KAFKA_BROKER || "localhost:9092"]
});

const consumer = kafka.consumer({ groupId: "enrollment-group" });

async function handleEnrollmentEvent(enrollment) {
  console.log("\n📩 NEW ENROLLMENT EVENT");
  console.log("========================");
  console.log("Enrollment ID :", enrollment.id);
  console.log("Student ID    :", enrollment.studentId);
  console.log("Course ID     :", enrollment.courseId);
  console.log("Timestamp     :", new Date().toISOString());
  console.log("========================\n");
}

async function runConsumer() {
  try {
    await consumer.connect();
    console.log("✅ Kafka Consumer connected");
    await consumer.subscribe({ topic: "enrollment-created", fromBeginning: false });
    console.log("👂 Listening to topic: enrollment-created");
    await consumer.run({
      eachMessage: async ({ message }) => {
        try {
          const data = JSON.parse(message.value.toString());
          await handleEnrollmentEvent(data);
        } catch (err) {
          console.error("❌ Error processing message:", err.message);
        }
      }
    });
  } catch (err) {
    console.error("❌ Kafka consumer error:", err.message);
    setTimeout(runConsumer, 5000);
  }
}

runConsumer();
