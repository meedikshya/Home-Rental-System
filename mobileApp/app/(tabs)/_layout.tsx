import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FontAwesome5 } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const Layout = () => {
  return (
    <Tabs
      screenOptions={{
        tabBarLabelStyle: {
          fontFamily: 'mon-sb',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ size, color }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          tabBarLabel: 'Explore',
          tabBarIcon: ({ size, color }) => <Ionicons name="search" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="favourites"
        options={{
          tabBarLabel: 'Favourites',
          tabBarIcon: ({ size, color }) => <FontAwesome5 name="heart" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ size, color }) => <MaterialCommunityIcons name="account" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

export default Layout;