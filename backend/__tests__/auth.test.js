const { register, login } = require("../controllers/authController");
const User = require("../models/User");

jest.mock("../models/User");
jest.mock("../utils/logger", () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
}));

jest.mock("../middleware/auth", () => ({
    generateToken: jest.fn(() => "mock-jwt-token"),
    authenticateToken: jest.fn((req, res, next) => next()),
    initializePassport: jest.fn(),
}));

describe("Auth Controller", () => {
    let mockReq;
    let mockRes;
    let mockNext;

    beforeEach(() => {
        mockReq = { body: {} };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        mockNext = jest.fn();
        jest.clearAllMocks();
    });

    describe("register", () => {
        it("should return 400 if required fields are missing", async () => {
            mockReq.body = { email: "test@test.com" };

            await register(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({ message: expect.any(String) })
            );
        });

        it("should return 409 if user already exists", async () => {
            mockReq.body = {
                email: "test@test.com",
                password: "password123",
                name: "Test User",
            };

            User.findOne.mockResolvedValue({ email: "test@test.com" });

            await register(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(409);
        });

        it("should register a new user successfully", async () => {
            mockReq.body = {
                email: "new@test.com",
                password: "password123",
                name: "New User",
            };

            User.findOne.mockResolvedValue(null);
            User.create.mockResolvedValue({
                _id: "mock-id",
                email: "new@test.com",
                name: "New User",
                toJSON: () => ({
                    _id: "mock-id",
                    email: "new@test.com",
                    name: "New User",
                }),
            });

            await register(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "User registered successfully.",
                    token: "mock-jwt-token",
                })
            );
        });
    });

    describe("login", () => {
        it("should return 400 if email or password missing", async () => {
            mockReq.body = { email: "test@test.com" };

            await login(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it("should return 401 for invalid credentials", async () => {
            mockReq.body = { email: "test@test.com", password: "wrong" };

            User.findOne.mockResolvedValue(null);

            await login(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(401);
        });
    });
});
