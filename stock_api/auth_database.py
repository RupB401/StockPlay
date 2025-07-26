import psycopg2
import psycopg2.extras
import bcrypt
import secrets
import string
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from database import get_connection
import logging

class AuthDatabase:
    @staticmethod
    def create_auth_tables():
        """Create users and otp_codes tables if they don't exist"""
        try:
            conn = get_connection()
            with conn:
                with conn.cursor() as cur:
                    # Create users table
                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS users (
                            id SERIAL PRIMARY KEY,
                            email VARCHAR(255) UNIQUE NOT NULL,
                            password_hash VARCHAR(255),
                            name VARCHAR(255) NOT NULL,
                            first_name VARCHAR(255),
                            last_name VARCHAR(255),
                            phone VARCHAR(20),
                            country VARCHAR(100),
                            timezone VARCHAR(100),
                            bio TEXT,
                            default_order_type VARCHAR(50) DEFAULT 'Market Order',
                            risk_tolerance VARCHAR(50) DEFAULT 'Moderate',
                            oauth_provider VARCHAR(50),
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        )
                    """)
                    
                    # Add new profile columns if they don't exist (for existing databases)
                    profile_columns = [
                        "ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(255)",
                        "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(255)",
                        "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)",
                        "ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(100)",
                        "ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(100)",
                        "ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT",
                        "ALTER TABLE users ADD COLUMN IF NOT EXISTS default_order_type VARCHAR(50) DEFAULT 'Market Order'",
                        "ALTER TABLE users ADD COLUMN IF NOT EXISTS risk_tolerance VARCHAR(50) DEFAULT 'Moderate'"
                    ]
                    
                    for column_sql in profile_columns:
                        cur.execute(column_sql)
                    
                    # Remove profile_image column if it exists
                    cur.execute("ALTER TABLE users DROP COLUMN IF EXISTS profile_image")
                    
                    # Create otp_codes table
                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS otp_codes (
                            id SERIAL PRIMARY KEY,
                            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                            otp VARCHAR(10) NOT NULL,
                            expiry_time TIMESTAMP NOT NULL,
                            used BOOLEAN DEFAULT FALSE,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        )
                    """)
                    
                    # Create refresh_tokens table
                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS refresh_tokens (
                            id SERIAL PRIMARY KEY,
                            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                            token VARCHAR(255) UNIQUE NOT NULL,
                            expiry_time TIMESTAMP NOT NULL,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        )
                    """)
                    
                    logging.info("✅ Auth tables created successfully")
                    return True
        except Exception as e:
            logging.error(f"❌ Error creating auth tables: {str(e)}")
            return False
        finally:
            if 'conn' in locals():
                conn.close()

    @staticmethod
    def create_user(email: str, password: str, name: str, oauth_provider: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Create a new user"""
        try:
            conn = get_connection()
            with conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    # Hash password if provided
                    password_hash = None
                    if password:
                        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                    
                    cur.execute("""
                        INSERT INTO users (email, password_hash, name, oauth_provider)
                        VALUES (%s, %s, %s, %s)
                        RETURNING id, email, name, oauth_provider, created_at
                    """, (email, password_hash, name, oauth_provider))
                    
                    user = cur.fetchone()
                    return dict(user) if user else None
        except psycopg2.IntegrityError:
            logging.error(f"User with email {email} already exists")
            return None
        except Exception as e:
            logging.error(f"Error creating user: {str(e)}")
            return None
        finally:
            if 'conn' in locals():
                conn.close()

    @staticmethod
    def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
        """Get user by email"""
        try:
            conn = get_connection()
            with conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("""
                        SELECT id, email, password_hash, name, first_name, last_name, 
                               phone, country, timezone, bio, default_order_type, risk_tolerance, 
                               oauth_provider, created_at
                        FROM users WHERE email = %s
                    """, (email,))
                    
                    user = cur.fetchone()
                    return dict(user) if user else None
        except Exception as e:
            logging.error(f"Error getting user by email: {str(e)}")
            return None
        finally:
            if 'conn' in locals():
                conn.close()

    @staticmethod
    def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        try:
            conn = get_connection()
            with conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("""
                        SELECT id, email, password_hash, name, first_name, last_name, 
                               phone, country, timezone, bio, default_order_type, risk_tolerance, 
                               oauth_provider, created_at
                        FROM users WHERE id = %s
                    """, (user_id,))
                    
                    user = cur.fetchone()
                    return dict(user) if user else None
        except Exception as e:
            logging.error(f"Error getting user by ID: {str(e)}")
            return None
        finally:
            if 'conn' in locals():
                conn.close()

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        try:
            return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
        except Exception as e:
            logging.error(f"Error verifying password: {str(e)}")
            return False

    @staticmethod
    def generate_otp() -> str:
        """Generate a 6-digit OTP"""
        return ''.join(secrets.choice(string.digits) for _ in range(6))

    @staticmethod
    def store_otp(user_id: int, otp: str, expiry_minutes: int = 10) -> bool:
        """Store OTP for password reset"""
        try:
            conn = get_connection()
            with conn:
                with conn.cursor() as cur:
                    expiry_time = datetime.now() + timedelta(minutes=expiry_minutes)
                    
                    # Invalidate previous OTPs for this user
                    cur.execute("""
                        UPDATE otp_codes SET used = TRUE 
                        WHERE user_id = %s AND used = FALSE
                    """, (user_id,))
                    
                    # Insert new OTP
                    cur.execute("""
                        INSERT INTO otp_codes (user_id, otp, expiry_time)
                        VALUES (%s, %s, %s)
                    """, (user_id, otp, expiry_time))
                    
                    return True
        except Exception as e:
            logging.error(f"Error storing OTP: {str(e)}")
            return False
        finally:
            if 'conn' in locals():
                conn.close()

    @staticmethod
    def verify_otp(user_id: int, otp: str) -> bool:
        """Verify OTP for password reset"""
        try:
            conn = get_connection()
            with conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT id FROM otp_codes 
                        WHERE user_id = %s AND otp = %s 
                        AND expiry_time > NOW() AND used = FALSE
                    """, (user_id, otp))
                    
                    result = cur.fetchone()
                    if result:
                        # Mark OTP as used
                        cur.execute("""
                            UPDATE otp_codes SET used = TRUE 
                            WHERE id = %s
                        """, (result[0],))
                        return True
                    return False
        except Exception as e:
            logging.error(f"Error verifying OTP: {str(e)}")
            return False
        finally:
            if 'conn' in locals():
                conn.close()

    @staticmethod
    def update_password(user_id: int, new_password: str) -> bool:
        """Update user password"""
        try:
            conn = get_connection()
            with conn:
                with conn.cursor() as cur:
                    password_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                    
                    cur.execute("""
                        UPDATE users SET password_hash = %s, updated_at = NOW()
                        WHERE id = %s
                    """, (password_hash, user_id))
                    
                    return cur.rowcount > 0
        except Exception as e:
            logging.error(f"Error updating password: {str(e)}")
            return False
        finally:
            if 'conn' in locals():
                conn.close()

    @staticmethod
    def store_refresh_token(user_id: int, token: str, expiry_days: int = 30) -> bool:
        """Store refresh token"""
        try:
            conn = get_connection()
            with conn:
                with conn.cursor() as cur:
                    expiry_time = datetime.now() + timedelta(days=expiry_days)
                    
                    cur.execute("""
                        INSERT INTO refresh_tokens (user_id, token, expiry_time)
                        VALUES (%s, %s, %s)
                    """, (user_id, token, expiry_time))
                    
                    return True
        except Exception as e:
            logging.error(f"Error storing refresh token: {str(e)}")
            return False
        finally:
            if 'conn' in locals():
                conn.close()

    @staticmethod
    def verify_refresh_token(token: str) -> Optional[int]:
        """Verify refresh token and return user_id"""
        try:
            conn = get_connection()
            with conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT user_id FROM refresh_tokens 
                        WHERE token = %s AND expiry_time > NOW()
                    """, (token,))
                    
                    result = cur.fetchone()
                    return result[0] if result else None
        except Exception as e:
            logging.error(f"Error verifying refresh token: {str(e)}")
            return None
        finally:
            if 'conn' in locals():
                conn.close()

    @staticmethod
    def delete_refresh_token(token: str) -> bool:
        """Delete refresh token (logout)"""
        try:
            conn = get_connection()
            with conn:
                with conn.cursor() as cur:
                    cur.execute("DELETE FROM refresh_tokens WHERE token = %s", (token,))
                    return cur.rowcount > 0
        except Exception as e:
            logging.error(f"Error deleting refresh token: {str(e)}")
            return False
        finally:
            if 'conn' in locals():
                conn.close()

    @staticmethod
    def update_user_oauth_provider(user_id: int, oauth_provider: str) -> bool:
        """Update user's OAuth provider"""
        try:
            conn = get_connection()
            with conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        UPDATE users 
                        SET oauth_provider = %s 
                        WHERE id = %s
                    """, (oauth_provider, user_id))
                    return cur.rowcount > 0
        except Exception as e:
            logging.error(f"Error updating user OAuth provider: {str(e)}")
            return False
        finally:
            if 'conn' in locals():
                conn.close()
