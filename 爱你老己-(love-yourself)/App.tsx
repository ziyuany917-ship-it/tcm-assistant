import React, { useState, useEffect } from 'react';
import AuthPage from './components/AuthPage';
import MainLayout from './components/MainLayout';

function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    return localStorage.getItem('ly_current_user');
  });

  const handleLogin = (username: string) => {
    setCurrentUser(username);
    localStorage.setItem('ly_current_user', username);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('ly_current_user');
  };

  if (!currentUser) {
    return <AuthPage onLogin={handleLogin} />;
  }

  // Passing 'currentUser' as a key forces React to unmount and remount MainLayout 
  // when the user changes, ensuring state is reset and re-initialized from the new user's localStorage.
  return (
    <MainLayout 
      key={currentUser} 
      username={currentUser} 
      onLogout={handleLogout} 
    />
  );
}

export default App;