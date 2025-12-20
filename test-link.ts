function generateLink() {
  // generate a link of 7 characters alphabetical, mixed upper case and lower case
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let link = "";
  for (let i = 0; i < 7; i++) {
    link += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return link;
}

console.log(generateLink());
