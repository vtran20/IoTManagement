import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../common/guards/auth.guard";
import { RateLimitService } from "../common/rate-limit/rate-limit.service";
import { RequestWithContext } from "../common/request-context";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";

@Controller("auth")
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(RateLimitService)
    private readonly rateLimitService: RateLimitService,
  ) {}

  @Post("login")
  login(@Body() dto: LoginDto, @Req() request: RequestWithContext) {
    this.rateLimitService.check({
      key: `auth:${request.ip ?? "local"}:${dto.email?.toLowerCase() ?? "unknown"}`,
      limit: 5,
      message: "Too many auth attempts. Try again later.",
      windowMs: 60_000,
    });
    return this.authService.login(dto);
  }

  @Get("me")
  @UseGuards(AuthGuard)
  me(@Req() request: RequestWithContext) {
    return request.context;
  }
}
