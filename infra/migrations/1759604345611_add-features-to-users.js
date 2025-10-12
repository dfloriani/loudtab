exports.up = (pgm) => {
  pgm.addColumns("users", {
    features: {
      type: "varchar[]",
      notNull: true,
      default: "{}", // represents array in postgres
    },
  });
};

exports.down = false;
