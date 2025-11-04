# 📡 WiFi Speed Test

A modern, client-side web application designed to quickly and accurately measure your internet connection's download speed and latency (ping) directly from your browser. This project is built with a focus on a clean, professional UI and user experience.

## ✨ Features

*   **⚡️ Accurate Download Speed:** Utilizes multiple parallel connections to provide reliable download speeds, comparable to services like Fast.com.
*   **⏱️ Unloaded Latency (Ping):** Measures your network's response time when idle.
*   **🎨 Professional & Flat UI:** A clean, minimalist design for a modern aesthetic.
*   **🌙 Light/Dark Mode Toggle:** Adapts to your system preference by default, with a toggle to switch themes manually.
*   **📱 Fully Responsive:** Optimized for a seamless experience across desktop and mobile devices.
*   **📊 Test Details:** Provides information about the test client (your browser) and the test server's domain.
*   **🚫 No Backend Required:** Runs entirely in your browser using JavaScript, making it simple to deploy on static hosting like GitHub Pages.

## 🚀 Live Demo

Experience the app live:
**[View Live Demo](https://adithyadaine.github.io/wifi-speedtest-webapp/)**

*(Replace `adithyadaine.github.io/wifi-speedtest-webapp/` with your actual GitHub Pages URL if it's different)*

## 💡 How It Works

This application operates entirely within your web browser using JavaScript. When you click "Start Test", it performs the following:

1.  **Latency (Ping) Test:** Sends small requests to a reliable CDN endpoint (Cloudflare) and measures the round-trip time, providing your connection's unloaded latency.
2.  **Download Speed Test:** Initiates multiple concurrent `fetch` requests to download large test files from high-bandwidth CDN servers. By measuring the total data received over time, it calculates your download speed in Mbps, effectively saturating your bandwidth.

**Why no Upload Test?**
The upload test has been intentionally disabled. Achieving accurate and high upload speed measurements directly from a browser using purely client-side JavaScript (without a dedicated, high-performance, CORS-enabled backend server) is highly challenging due to browser limitations, `crypto.getRandomValues` API entropy limits for large data generation, and the overhead of general-purpose web endpoints. To provide a genuinely accurate figure comparable to dedicated speed test services, a more complex architecture with a custom backend would be required.

## 🛠️ Technology Stack

*   **HTML5:** Structure of the web application.
*   **CSS3:** Styling, utilizing CSS variables for theme management and responsiveness.
*   **Vanilla JavaScript (ES6+):** All the core logic for running the speed tests and managing the UI.

## 📂 Project Structure

wifi-speedtest-webapp/

├── index.html          # Main application page

├── css/

│   └── style.css      # All styling for the app (light/dark themes, responsive)

└── js/

└── speedtest.js   # JavaScript logic for speed tests, UI interactions, and theme management

## ⚙️ Local Development

To run this project locally:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/adithyadaine/wifi-speedtest-webapp.git
    cd wifi-speedtest-webapp
    ```
2.  **Open `index.html`:** You can simply open the `index.html` file directly in your web browser.
    *   Alternatively, for a more robust development environment, you can serve it with a local HTTP server:
        ```bash
        # Using Python's built-in server
        python -m http.server 8000
        # Then open http://localhost:8000 in your browser
        ```

## 🚀 Deployment

This application is perfectly suited for static hosting platforms. The recommended and easiest way to deploy it is via GitHub Pages.

1.  **Ensure your code is pushed** to your GitHub repository (e.g., `main` branch).
    ```bash
    git add .
    git commit -m "Add README.md"
    git push origin main
    ```
2.  **Enable GitHub Pages:**
    *   Go to your repository on GitHub.
    *   Click on **`Settings`** (usually in the top navigation bar).
    *   In the left sidebar, click on **`Pages`**.
    *   Under the "Source" section, select your branch (e.g., `main`) and ensure the folder is set to `/ (root)`.
    *   Click **`Save`**.
3.  **Access Your Site:** Your application will be live in a few moments at a URL similar to `https://<YOUR_USERNAME>.github.io/<YOUR_REPOSITORY_NAME>/`.

## 🤝 Contributing

Feel free to fork this repository, open issues, or submit pull requests. Any contributions to improve accuracy, add features (e.g., historical data storage, more detailed network info), or enhance the UI are welcome!

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 🧑💻 Author

Adithya Daine Manjunath

---