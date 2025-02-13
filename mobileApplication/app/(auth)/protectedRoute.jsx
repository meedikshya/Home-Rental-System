import React from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { FIREBASE_AUTH } from "../../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";

const ProtectedRoute = ({ children }) => {
  const [loading, setLoading] = React.useState(true);
  const [authenticated, setAuthenticated] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(FIREBASE_AUTH, (user) => {
      if (user) {
        setAuthenticated(true);
      } else {
        setAuthenticated(false);
        router.replace("/(auth)/sign-in");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#20319D" />
      </View>
    );
  }

  if (!authenticated) return null;

  return children;
};

export default ProtectedRoute;
