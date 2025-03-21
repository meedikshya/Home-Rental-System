import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { FontAwesome5 } from "@expo/vector-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ProtectedRoute from "../(auth)/protectedRoute";

const Layout = () => {
  return (
    <ProtectedRoute>
      <Tabs
        screenOptions={{
          tabBarLabelStyle: {
            fontFamily: "mon-sb",
          },
          tabBarActiveTintColor: "#3B82F6",
          tabBarInactiveTintColor: "#8E8E93",
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            tabBarLabel: "Home",
            tabBarIcon: ({ size, color }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="chat"
          options={{
            tabBarLabel: "Chat",
            tabBarIcon: ({ size, color }) => (
              <Ionicons name="chatbubble-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="favourites"
          options={{
            tabBarLabel: "Favourites",
            tabBarIcon: ({ size, color }) => (
              <FontAwesome5 name="heart" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="notification"
          options={{
            tabBarLabel: "Notification",
            tabBarIcon: ({ size, color }) => (
              <Ionicons
                name="notifications-outline"
                size={size}
                color={color}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            tabBarLabel: "Profile",
            tabBarIcon: ({ size, color }) => (
              <MaterialCommunityIcons
                name="account"
                size={size}
                color={color}
              />
            ),
          }}
        />
      </Tabs>
    </ProtectedRoute>
  );
};

export default Layout;
