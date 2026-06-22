// graphql/resolvers.js
// Receives pre-built gRPC clients from the gateway
module.exports = (clients) => {
  const { studentClient, courseClient, enrollmentClient } = clients;

  // Helper to wrap gRPC callbacks in Promises
  const call = (client, method, args) =>
    new Promise((resolve, reject) => {
      client[method](args, (err, res) => {
        if (err) return reject(err);
        resolve(res);
      });
    });

  return {
    Query: {
      student: async (_, { id }) => {
        const res = await call(studentClient, "GetStudent", { student_id: id });
        return res.student;
      },
      students: async () => {
        const res = await call(studentClient, "GetStudents", {});
        return res.students;
      },
      course: async (_, { id }) => {
        const res = await call(courseClient, "GetCourse", { course_id: id });
        return res.course;
      },
      courses: async () => {
        const res = await call(courseClient, "GetCourses", {});
        return res.courses;
      },
      enrollments: async () => {
        const res = await call(enrollmentClient, "GetEnrollments", {});
        return res.enrollments;
      }
    },

    Mutation: {
      createStudent: async (_, args) => {
        const res = await call(studentClient, "CreateStudent", args);
        return res.student;
      },
      updateStudent: async (_, { id, name, email }) => {
        const res = await call(studentClient, "UpdateStudent", { student_id: id, name, email });
        return res.student;
      },
      deleteStudent: async (_, { id }) => {
        const res = await call(studentClient, "DeleteStudent", { student_id: id });
        return { success: res.success };
      },

      createCourse: async (_, args) => {
        const res = await call(courseClient, "CreateCourse", args);
        return res.course;
      },
      updateCourse: async (_, { id, title, description }) => {
        const res = await call(courseClient, "UpdateCourse", { course_id: id, title, description });
        return res.course;
      },
      deleteCourse: async (_, { id }) => {
        const res = await call(courseClient, "DeleteCourse", { course_id: id });
        return { success: res.success };
      },

      enroll: async (_, args) => {
        const res = await call(enrollmentClient, "CreateEnrollment", args);
        return res.enrollment;
      },
      deleteEnrollment: async (_, { id }) => {
        const res = await call(enrollmentClient, "DeleteEnrollment", { enrollment_id: id });
        return { success: res.success };
      }
    }
  };
};
