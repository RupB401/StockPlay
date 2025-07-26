import smtplib
import os
from dotenv import load_dotenv
import logging

load_dotenv("credentials.env")

class EmailService:
    def __init__(self):
        self.smtp_server = "smtp.gmail.com"
        self.smtp_port = 587
        self.sender_email = os.getenv("SMTP_EMAIL")
        self.sender_password = os.getenv("SMTP_PASSWORD")
        
    def send_otp_email(self, recipient_email: str, otp: str, user_name: str) -> bool:
        """Send OTP email for password reset"""
        try:
            if not self.sender_email or not self.sender_password:
                logging.error("SMTP credentials not configured")
                return False
                
            # Create message
            subject = "StockPlay - Password Reset OTP"
            
            # Create HTML content
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body {{ font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }}
                    .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }}
                    .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; }}
                    .header h1 {{ color: white; margin: 0; font-size: 28px; font-weight: 600; }}
                    .content {{ padding: 40px 30px; }}
                    .otp-box {{ background: #f1f5f9; border: 2px dashed #94a3b8; border-radius: 12px; padding: 20px; text-align: center; margin: 30px 0; }}
                    .otp-code {{ font-size: 32px; font-weight: bold; color: #1e293b; letter-spacing: 8px; font-family: 'Courier New', monospace; }}
                    .footer {{ background: #f8fafc; padding: 20px; text-align: center; font-size: 14px; color: #64748b; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔐 Password Reset Request</h1>
                    </div>
                    <div class="content">
                        <h2 style="color: #1e293b; margin-bottom: 20px;">Hello {user_name}!</h2>
                        <p style="color: #475569; line-height: 1.6; margin-bottom: 25px;">
                            We received a request to reset your password for your StockPlay account. 
                            Use the OTP code below to reset your password:
                        </p>
                        <div class="otp-box">
                            <div class="otp-code">{otp}</div>
                            <p style="margin: 10px 0 0 0; color: #64748b; font-size: 14px;">This code expires in 10 minutes</p>
                        </div>
                        <p style="color: #ef4444; font-size: 14px; margin: 25px 0;">
                            ⚠️ If you didn't request this reset, please ignore this email and your password will remain unchanged.
                        </p>
                    </div>
                    <div class="footer">
                        <p>© 2025 StockPlay. Learn better Stock Investing.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            # Create message
            message = f"""From: StockPlay <{self.sender_email}>
To: {recipient_email}
Subject: {subject}
Content-Type: text/html; charset=UTF-8

{html_content}"""
            
            # Send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.sender_email, self.sender_password)
                server.sendmail(self.sender_email, [recipient_email], message.encode('utf-8'))
                
            logging.info(f"✅ OTP email sent successfully to {recipient_email}")
            return True
            
        except Exception as e:
            logging.error(f"❌ Error sending OTP email: {str(e)}")
            return False

    def send_welcome_email(self, recipient_email: str, user_name: str) -> bool:
        """Send welcome email to new users"""
        try:
            if not self.sender_email or not self.sender_password:
                logging.error("SMTP credentials not configured")
                return False
                
            subject = "Welcome to StockPlay! 🚀"
            
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body {{ font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }}
                    .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }}
                    .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; }}
                    .header h1 {{ color: white; margin: 0; font-size: 32px; font-weight: 600; }}
                    .content {{ padding: 40px 30px; }}
                    .footer {{ background: #f8fafc; padding: 20px; text-align: center; font-size: 14px; color: #64748b; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🚀 Welcome to StockPlay!</h1>
                    </div>
                    <div class="content">
                        <h2 style="color: #1e293b; margin-bottom: 20px;">Hello {user_name}!</h2>
                        <p style="color: #475569; line-height: 1.6; margin-bottom: 25px;">
                            Thank you for joining StockPlay! We're excited to help you learn better stock investing.
                        </p>
                        <p style="color: #475569; line-height: 1.6; margin-bottom: 25px;">
                            Start exploring our features:
                        </p>
                        <ul style="color: #475569; line-height: 1.8;">
                            <li>📊 Real-time stock data and charts</li>
                            <li>📈 Market indices and ETFs</li>
                            <li>🔍 Advanced stock screener</li>
                            <li>📰 Latest market news and earnings</li>
                            <li>💼 Portfolio tracking</li>
                        </ul>
                    </div>
                    <div class="footer">
                        <p>© 2025 StockPlay. Learn better Stock Investing.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            message = f"""From: StockPlay <{self.sender_email}>
To: {recipient_email}
Subject: {subject}
Content-Type: text/html; charset=UTF-8

{html_content}"""
            
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.sender_email, self.sender_password)
                server.sendmail(self.sender_email, [recipient_email], message.encode('utf-8'))
                
            logging.info(f"✅ Welcome email sent successfully to {recipient_email}")
            return True
            
        except Exception as e:
            logging.error(f"❌ Error sending welcome email: {str(e)}")
            return False
