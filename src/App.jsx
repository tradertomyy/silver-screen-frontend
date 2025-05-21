// client
//	git
//	cd virtual-movie-night/client
//	npm run dev

// server 
//	cmd
//	cd c:\users\thomas\virtual-movie-night\server
//	node server.js

// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Catalogue from './pages/Catalogue';
import AboutPage from './pages/AboutPage';
import MovieRoom from './MovieRoom';

function App() {
  return (
    <Router>
      <div style={{ minHeight: '100vh' }}>
        <Navbar />
        <Routes>
          <Route path="/" element={<Catalogue />} /> {/* Make Catalogue the home page */}
          <Route path="/catalogue" element={<Catalogue />} /> {/* Optional alternate path */}
          <Route path="/about" element={<AboutPage />} />
          <Route path="/watch/:movieId" element={<MovieRoom />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;