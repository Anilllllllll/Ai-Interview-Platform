// ============================================
// Integration Tests for Auth API
// ============================================
// Tests the full HTTP request lifecycle using supertest:
//   HTTP Request → Express Router → Controller → Response
//
// We mock the database layer so tests are fast and
// don't require a running MongoDB instance.

const request = require("supertest");
const express = require("express");

// Mock dependencies BEFORE requiring routes
jest.mock("../../utils/logger", () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
}));

jest.mock("../../middleware/auth", () => {
    const jwt = require("jsonwebtoken");
    return {
        generateToken: jest.fn((id) =>
            jwt.sign({ id }, "test-secret", { expiresIn: "1h" })
        ),
        authenticateToken: jest.fn((req, res, next) => next()),
        initializePassport: jest.fn(),
    };
});

const User = require("../../models/User");
jest.mock("../../models/User");

const authRoutes = require("../../routes/auth");

// Create a minimal Express app for testing
let app;

beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/api/auth", authRoutes);
});

afterEach(() => {
    jest.clearAllMocks();
});

// ─────────────────────────────────────────
// TEST SUITE: POST /api/auth/register
// ─────────────────────────────────────────
describe("POST /api/auth/register", () => {
    it("should return 201 and token on successful registration", async () => {
        // Mock: no existing user found
        User.findOne.mockResolvedValue(null);
        // Mock: user created successfully
        User.create.mockResolvedValue({
            _id: "mock-id-123",
            name: "Test User",
            email: "test@example.com",
            toJSON: () => ({
                _id: "mock-id-123",
                name: "Test User",
                email: "test@example.com",
            }),
        });

        const res = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Test User",
                email: "test@example.com",
                password: "StrongPass123!",
            });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty("token");
        expect(res.body).toHaveProperty("message", "User registered successfully.");
        expect(res.body.user.email).toBe("test@example.com");
        // Verify password is NOT in response
        expect(res.body.user).not.toHaveProperty("passwordHash");
        expect(res.body.user).not.toHaveProperty("password");
    });

    it("should return 400 when required fields are missing", async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send({ email: "test@example.com" }); // missing name & password

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("message");
    });

    it("should return 409 when email already exists", async () => {
        // Mock: user already exists
        User.findOne.mockResolvedValue({ email: "test@example.com" });

        const res = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Test User",
                email: "test@example.com",
                password: "StrongPass123!",
            });

        expect(res.status).toBe(409);
        expect(res.body.message).toMatch(/already exists/i);
    });

    it("should handle server errors gracefully", async () => {
        User.findOne.mockRejectedValue(new Error("Database connection failed"));

        const res = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Test User",
                email: "test@example.com",
                password: "StrongPass123!",
            });

        // Should return 500 or handle error, not crash
        expect(res.status).toBeGreaterThanOrEqual(400);
    });
});

// ─────────────────────────────────────────
// TEST SUITE: POST /api/auth/login
// ─────────────────────────────────────────
describe("POST /api/auth/login", () => {
    it("should return 400 when email or password is missing", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: "test@example.com" }); // missing password

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("message");
    });

    it("should return 401 for non-existent email", async () => {
        User.findOne.mockResolvedValue(null);

        const res = await request(app)
            .post("/api/auth/login")
            .send({
                email: "nobody@example.com",
                password: "StrongPass123!",
            });

        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/invalid/i);
    });

    it("should return 401 for wrong password", async () => {
        // Mock: user exists but password check fails
        User.findOne.mockResolvedValue({
            _id: "mock-id-123",
            email: "test@example.com",
            comparePassword: jest.fn().mockResolvedValue(false),
        });

        const res = await request(app)
            .post("/api/auth/login")
            .send({
                email: "test@example.com",
                password: "WrongPassword!",
            });

        expect(res.status).toBe(401);
    });

    it("should return 200 and token for valid credentials", async () => {
        // Mock: user exists and password matches
        User.findOne.mockResolvedValue({
            _id: "mock-id-123",
            name: "Test User",
            email: "test@example.com",
            comparePassword: jest.fn().mockResolvedValue(true),
            toJSON: () => ({
                _id: "mock-id-123",
                name: "Test User",
                email: "test@example.com",
            }),
        });

        const res = await request(app)
            .post("/api/auth/login")
            .send({
                email: "test@example.com",
                password: "StrongPass123!",
            });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("token");
        expect(res.body.user.email).toBe("test@example.com");
    });
});
