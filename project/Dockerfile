# One image is reused for every Node-based container (gateway, the 3 gRPC
# services, and the Kafka consumer). docker-compose.yml picks which file to
# run via the `command` override on each service.

FROM node:18-alpine

# python3/make/g++ are required to compile the native "sqlite3" addon
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json ./
RUN npm install --omit=dev

# Copy the rest of the project (keeps the same relative folder layout the
# code already expects, e.g. ../student-service/student.proto)
COPY . .

EXPOSE 3000 50051 50052 50053

CMD ["node", "gateway/apiGateway.js"]
