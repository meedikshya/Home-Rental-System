export const getRandomData = (req, res) => {
  const random = [
    {
      id: 1,
      title: "Random",
      content: "bjskskdhwdio",
    },
    {
      id: 2,
      title: "Random",
      content: "bjskskdhwdio",
    },
  ];
  res.json(random);
};
