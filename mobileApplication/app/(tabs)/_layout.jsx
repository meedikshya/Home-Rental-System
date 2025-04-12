import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { FontAwesome5 } from "@expo/vector-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ProtectedRoute from "../(auth)/protectedRoute";
import { useNotifications } from "../../context/NotificationContext";
import { View, Text } from "react-native";

const Layout = () => {
  const { unreadCount } = useNotifications();

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
              <View>
                <Ionicons
                  name="notifications-outline"
                  size={size}
                  color={color}
                />
                {unreadCount > 0 && (
                  <View
                    style={{
                      position: "absolute",
                      right: -6,
                      top: -3,
                      backgroundColor: "#EF4444",
                      borderRadius: 10,
                      width: unreadCount > 99 ? 20 : unreadCount > 9 ? 18 : 16,
                      height: 16,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: "white",
                        fontSize: 10,
                        fontWeight: "bold",
                      }}
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </Text>
                  </View>
                )}
              </View>
            ),
            tabBarBadge: unreadCount > 0 ? unreadCount : null,
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
