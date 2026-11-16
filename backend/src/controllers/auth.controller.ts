import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { role } = req.body;
      let result;
      if (role === 'DONOR') {
        result = await authService.registerDonor(req.body);
      } else if (role === 'NGO') {
        result = await authService.registerNgo(req.body);
      } else {
        res.status(400).json({ success: false, error: 'Registration role must be DONOR or NGO' });
        return;
      }

      res.cookie('token', result.token, authService.getCookieOptions());
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.login(req.body);
      res.cookie('token', result.token, authService.getCookieOptions());
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    res.clearCookie('token');
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  }

  async getMe(req: Request, res: Response): Promise<void> {
    res.status(200).json({
      success: true,
      data: {
        user: req.user,
      },
    });
  }
}

export const authController = new AuthController();
