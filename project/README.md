# 🎓 Student Platform — Microservices Architecture (Dockerized)

REST + GraphQL + gRPC + Kafka, all orchestrated with a single `docker-compose.yml`.

## 📐 Architecture

```
Client (Postman)
      │  REST + GraphQL (HTTP/1.1 + JSON)
      ▼
┌──────────────────────┐
│   API Gateway :3000  │  Express + Apollo
└──────┬───────┬────────┘
       │ gRPC  │ gRPC  │ gRPC
  ┌────▼──┐ ┌──▼───┐ ┌─▼─────────┐
  │Student│ │Course│ │Enrollment │
  │:50051 │ │:50052│ │:50053     │
  └───────┘ └──────┘ └─────┬─────┘
                            │ Kafka event
                     ┌──────▼──────┐
                     │ Kafka :9092 │  KRaft mode (no Zookeeper)
                     └──────┬──────┘
                     ┌──────▼──────┐
                     │  Consumer   │
                     └─────────────┘
```

One shared `Dockerfile` is reused for the gateway, the 3 gRPC services, and the
Kafka consumer — `docker-compose.yml` just overrides the `command` for each.
Kafka runs in **KRaft mode** (Kafka 4.x, no Zookeeper needed), using the
official `apache/kafka` image.

---

## 🚀 Run everything (one command)

From the project root (where `docker-compose.yml` lives):

```bash
docker compose up --build
```

That's it. This will:
1. Build the Node image (installs all dependencies once).
2. Start Kafka in KRaft mode and wait until it's healthy.
3. Start `student-service`, `course-service`, `enrollment-service`.
4. Start the Kafka consumer (notification service).
5. Start the API Gateway on `http://localhost:3000`.

Run it in the background instead:

```bash
docker compose up --build -d
```

---

## 🔧 Other useful commands

| Action                                   | Command                                  |
|-------------------------------------------|-------------------------------------------|
| Start (after first build)                 | `docker compose up`                       |
| Start in background                       | `docker compose up -d`                    |
| Rebuild after code changes                | `docker compose up --build`               |
| Stop everything                           | `docker compose down`                     |
| Stop and remove volumes                   | `docker compose down -v`                  |
| View logs (all services)                  | `docker compose logs -f`                  |
| View logs of one service                  | `docker compose logs -f gateway`          |
| List running containers                   | `docker compose ps`                       |
| Restart a single service                  | `docker compose restart enrollment-service` |
| Open a shell inside a container           | `docker compose exec gateway sh`          |
| Manually list Kafka topics                | `docker compose exec kafka /opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 --list` |

---

## 📡 REST API — `http://localhost:3000`

### Students
| Method | URL              | Body JSON                  |
|--------|------------------|-----------------------------|
| GET    | /students        | —                           |
| GET    | /students/:id    | —                           |
| POST   | /students        | `{"name":"","email":""}`    |
| PUT    | /students/:id    | `{"name":"","email":""}`    |
| DELETE | /students/:id    | —                           |

### Courses
| Method | URL           | Body JSON                          |
|--------|---------------|-------------------------------------|
| GET    | /courses      | —                                   |
| GET    | /courses/:id  | —                                   |
| POST   | /courses      | `{"title":"","description":""}`     |
| PUT    | /courses/:id  | `{"title":"","description":""}`     |
| DELETE | /courses/:id  | —                                   |

### Enrollments
| Method | URL                | Body JSON                          |
|--------|--------------------|-------------------------------------|
| GET    | /enrollments       | —                                   |
| GET    | /enrollments/:id   | —                                   |
| POST   | /enroll            | `{"studentId":"","courseId":""}`    |
| DELETE | /enrollments/:id   | —                                   |

---

## 📊 GraphQL — `POST http://localhost:3000/graphql`

```graphql
{ students { id name email } }
{ courses { id title description } }
{ enrollments { id studentId courseId } }

mutation { createStudent(name: "Alice", email: "alice@test.com") { id name } }
mutation { createCourse(title: "Node.js", description: "Intro") { id title } }
mutation { enroll(studentId: "1", courseId: "1") { id studentId courseId } }
```

---

## 🧪 Test with Postman

1. Import `postman_collection.json`.
2. `base_url` is already set to `http://localhost:3000`.
3. Run in order: `POST /students` → `POST /courses` → `POST /enroll` →
   check `docker compose logs -f kafka-consumer` for the event.

---

## 🗄 Databases

| Service     | Storage   | Notes                                              |
|-------------|-----------|------------------------------------------------------|
| Student     | SQLite3   | Inside the container — resets on `docker compose down -v`/rebuild |
| Course      | SQLite3   | Same as above                                        |
| Enrollment  | In-memory | Always resets on restart                             |

> Want the SQLite data to survive `docker compose down`? Add named volumes
> mapped to `/app/student-service` and `/app/course-service` in
> `docker-compose.yml` (left out by default to keep the setup simple).

---

## 🔌 Ports

| Service          | Port  |
|------------------|-------|
| API Gateway      | 3000  |
| Student Service  | 50051 |
| Course Service   | 50052 |
| Enrollment Svc   | 50053 |
| Kafka Broker     | 9092  |

---

## 💻 Running without Docker (optional)

Still supported — every service defaults to `localhost` when the Docker-only
environment variables aren't set:

```bash
npm install
# Terminal 1
node student-service/server.js
# Terminal 2
node course-service/server.js
# Terminal 3 (needs Kafka running locally on localhost:9092)
node enrollment-service/server.js
# Terminal 4
node kafka/consumer.js
# Terminal 5
node gateway/apiGateway.js
```
