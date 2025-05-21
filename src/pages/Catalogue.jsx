import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { movies, genreCategories } from '../data/movies';
import styles from './Catalogue.module.css';

export default function Catalogue() {
  const navigate = useNavigate();
  const rowRefs = useRef({});

  const scroll = (direction, genre) => {
    const row = rowRefs.current[genre];
    if (row) {
      row.scrollBy({
        left: direction === 'left' ? -300 : 300,
        behavior: 'smooth'
      });
    }
  };

  // Organize movies by genre
  const moviesByGenre = genreCategories.reduce((acc, genre) => {
    acc[genre] = movies.filter(movie => movie.genres.includes(genre));
    return acc;
  }, {});

  return (
    <div className={styles.catalogueContainer}>
      {genreCategories.map(genre => (
        moviesByGenre[genre]?.length > 0 && (
          <div key={genre} className={styles.genreSection}>
            <h2 className={styles.genreHeader}>{genre}</h2>
            
            <div className={styles.moviesRow} 
                 ref={el => rowRefs.current[genre] = el}>
              {moviesByGenre[genre].map(movie => (
                <div
                  key={movie.id}
                  className={styles.movieCard}
                  onClick={() => navigate(`/watch/${movie.id}`)}
                >
                  <img
                    src={movie.thumbnail}
                    alt={movie.title}
                    className={styles.thumbnail}
                  />
                  <div className={styles.titleOverlay}>
                    <h3>{movie.title}</h3>
                    <span>{movie.year}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.scrollButtons}>
              <button 
                className={styles.scrollButton}
                onClick={() => scroll('left', genre)}
              >
                ‹
              </button>
              <button
                className={styles.scrollButton}
                onClick={() => scroll('right', genre)}
              >
                ›
              </button>
            </div>
          </div>
        )
        
      ))}
    </div>
  );
}