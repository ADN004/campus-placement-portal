import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const response = await authAPI.getMe();
        setUser(response.data.data);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials);
      const { token, user } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);

      toast.success('Login successful!');

      // The login response carries only id, email, role and the default-password
      // flag. The fuller record — name, college, region — comes from /auth/me,
      // which otherwise only ran on a page refresh, so anything showing the
      // user's name fell back to their email until they reloaded. Hydrate in the
      // background: the redirect below doesn't wait on it, and a failure just
      // leaves the smaller object in place.
      authAPI
        .getMe()
        .then((me) => {
          const full = me?.data?.data;
          if (full) {
            setUser(full);
            localStorage.setItem('user', JSON.stringify(full));
          }
        })
        .catch(() => {
          // Non-fatal — the session is already valid.
        });

      return { success: true, user };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      return { success: false, message };
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      toast.success('Logged out successfully');
    }
  };

  const registerStudent = async (data) => {
    try {
      const response = await authAPI.registerStudent(data);

      // Registration now returns a session, so the student can be shown the
      // waiting screen instead of being sent to the login form to re-enter
      // credentials they were just issued. The account is pending, so this
      // session can reach nothing but /auth/me. If an older backend responds
      // without a token, nothing here runs and the caller falls back to the
      // login page.
      const { token, user: registered } = response?.data || {};
      if (token && registered) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(registered));
        setUser(registered);
      }

      return { success: true, signedIn: Boolean(token && registered) };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
      return { success: false, message };
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    registerStudent,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
