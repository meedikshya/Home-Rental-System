export const getRandomData = (req, res) => {
  const random = [
    {
      id: 1,
      title: "Random11",
      content: "bjskskdhwdio",
    },
    {
      id: 2,
      title: "Random2",
      content: "bjskskdhwdio",
    },
  ];
  res.json(random);
};
