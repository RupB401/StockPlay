import React from "react";
import { Link } from "react-router-dom";
import StockPlayLogo from "../Logo/StockPlayIcon-removebg-preview.png";

function Footer() {
  return (
    <footer className="bg-neutral text-neutral-content">
      {/* Main Footer Content */}
      <div className="footer p-10">
        <aside>
          <div className="flex items-center mb-4">
            <img
              src={StockPlayLogo}
              alt="StockPlay Logo"
              className="w-16 h-16 mr-3"
            />
            <div>
              <h3 className="font-bold text-xl">StockPlay</h3>
              <p className="text-sm opacity-80">Stock Investing Simulator</p>
            </div>
          </div>
          <p className="max-w-md text-sm opacity-90">
            StockPlay is a comprehensive stock market simulator designed to help
            users learn investing without risking real money. Practice trading,
            analyze portfolios, and master market strategies in a safe
            environment.
          </p>
        </aside>

        <nav>
          <h6 className="footer-title">Platform</h6>
          <Link to="/dashboard" className="link link-hover">
            Dashboard
          </Link>
          <Link to="/portfolio" className="link link-hover">
            Portfolio
          </Link>
          <Link to="/trading" className="link link-hover">
            Trading
          </Link>
          <Link to="/analytics" className="link link-hover">
            Analytics
          </Link>
        </nav>

        <nav>
          <h6 className="footer-title">Resources</h6>
          <Link to="/screener" className="link link-hover">
            Stock Screener
          </Link>
          <Link to="/market-indices" className="link link-hover">
            Market Indices
          </Link>
          <Link to="/etfs" className="link link-hover">
            ETFs
          </Link>
          <Link to="/options" className="link link-hover">
            Options
          </Link>
        </nav>

        <nav>
          <h6 className="footer-title">Connect with Developer</h6>
          <div className="flex flex-col space-y-2">
            <a
              href="mailto:rb636739@gmail.com"
              className="link link-hover flex items-center"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              rb636739@gmail.com
            </a>

            <a
              href="https://www.linkedin.com/in/rup-kumar-biswas-082452307/"
              target="_blank"
              rel="noopener noreferrer"
              className="link link-hover flex items-center"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
              LinkedIn Profile
            </a>

            <a
              href="https://github.com/RupB401"
              target="_blank"
              rel="noopener noreferrer"
              className="link link-hover flex items-center"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub Profile
            </a>
          </div>
        </nav>
      </div>

      {/* Bottom Footer */}
      <div className="footer footer-center border-t border-base-300 px-10 py-4">
        <aside>
          <p className="text-sm opacity-80">
            © {new Date().getFullYear()} StockPlay - Stock Investing Simulator.
            Made by
            <span className="font-semibold ml-1">Rup Kumar Biswas</span>
          </p>
          <div className="divider my-2"></div>
          <div className="text-xs opacity-70 max-w-4xl text-center">
            <p className="mb-2">
              <strong>Disclaimer:</strong> StockPlay is a virtual trading
              simulator for educational purposes only. All trades are simulated
              using virtual currency (QuantZ). This platform does not involve
              real money or actual stock purchases. Market data may be delayed
              and should not be used for real investment decisions.
            </p>
            <p>
              Past performance does not guarantee future results. Always conduct
              your own research and consult with financial advisors before
              making actual investment decisions.
            </p>
          </div>
        </aside>
      </div>
    </footer>
  );
}

export default Footer;
