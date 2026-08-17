import { createContext, useContext, useState, useEffect } from "react";
import { getCurrentUserFromApi } from "../services/authService";
import { ROLES, isPlatformOwner as checkPlatformOwner, isSuperAdmin as checkSuperAdmin, isAdmin as checkAdmin, isUser as checkUser } from "../constants/roles";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage and refresh from API
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        
        // Refresh user data from API to get latest assigned feeders
        try {
          const userData = await getCurrentUserFromApi();
          setUser(userData);
          localStorage.setItem("user", JSON.stringify(userData));
        } catch (error) {
          console.error("Failed to refresh user data on load", error);
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  // Development logger for platform context initialization (Task 11)
  useEffect(() => {
    if (!loading && user && checkPlatformOwner(user.role)) {
      if (import.meta.env.DEV) {
        console.log("Platform Context Initialized");
      }
    }
  }, [user, loading]);

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem("token", authToken);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.clear();
    window.dispatchEvent(new Event("tenant-logout"));
  };

  const refreshUser = async () => {
    try {
      const userData = await getCurrentUserFromApi();
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
      return userData;
    } catch (error) {
      console.error("Failed to refresh user data", error);
      throw error;
    }
  };

  // Derive role flags for the centralized Auth context (Task 10)
  const currentRole = user?.role || null;
  const isPlatformOwner = checkPlatformOwner(currentRole);
  const isSuperAdmin = checkSuperAdmin(currentRole);
  const isAdmin = checkAdmin(currentRole);
  const isUser = checkUser(currentRole);

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      loading, 
      login, 
      logout, 
      refreshUser,
      currentRole,
      isPlatformOwner,
      isSuperAdmin,
      isAdmin,
      isUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
