// kafka/producer.js
const { Kafka } = require("kafkajs");

// Kafka 4.x — KRaft mode, no Zookeeper
// KAFKA_BROKER can be overridden via env (e.g. "kafka:9092" inside Docker)
const kafka = new Kafka({
  clientId: "student-system",
  brokers: [process.env.KAFKA_BROKER || "localhost:9092"]
});

const producer = kafka.producer();
let isConnected = false;

async function connectProducer() {
  if (!isConnected) {
    await producer.connect();
    isConnected = true;
    console.log("✅ Kafka Producer connected");
  }
}

async function sendEnrollmentEvent(data) {
  try {
    await connectProducer();
    await producer.send({
      topic: "enrollment-created",
      messages: [{ key: data.id, value: JSON.stringify(data) }]
    });
    console.log("📤 Kafka event sent:", data.id);
  } catch (err) {
    console.error("❌ Kafka producer error:", err.message);
  }
}

module.exports = { sendEnrollmentEvent };
