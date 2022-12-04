export const calculateResult = (
  firstPlayerChoice,
  firstName,
  firstImagePath,
  firstPoints,
  secondPlayerChoice,
  secondName,
  secondImagePath,
  secondPoints,
  givenRound
) => {
  let result = {
    firstPlayer: {
      name: firstName,
      img: firstImagePath,
      win: false,
      points: firstPoints,
    },
    secondPlayer: {
      name: secondName,
      img: secondImagePath,
      win: false,
      points: secondPoints,
    },
    tie: false,
    round: givenRound,
  };
  if (firstPlayerChoice === "paper") {
    if (secondPlayerChoice === "scissor") {
      result.firstPlayer.win = false;
      result.secondPlayer.win = true;
      result.secondPlayer.points += 1;
    } else if (secondPlayerChoice === "rock") {
      result.firstPlayer.win = true;
      result.secondPlayer.win = false;
      result.firstPlayer.points += 1;
    } else if (secondPlayerChoice === "paper") {
      result.tie = true;
    }
    result.round += 1;
    return result;
  } else if (firstPlayerChoice === "rock") {
    if (secondPlayerChoice === "scissor") {
      result.firstPlayer.win = true;
      result.secondPlayer.win = false;
      result.firstPlayer.points += 1;
    } else if (secondPlayerChoice === "rock") {
      result.tie = true;
    } else if (secondPlayerChoice === "paper") {
      result.firstPlayer.win = false;
      result.secondPlayer.win = true;
      result.secondPlayer.points += 1;
    }
    result.round += 1;
    return result;
  } else if (firstPlayerChoice === "scissor") {
    if (secondPlayerChoice === "scissor") {
      result.tie = true;
    } else if (secondPlayerChoice === "rock") {
      result.firstPlayer.win = false;
      result.secondPlayer.win = true;
      result.secondPlayer.points += 1;
    } else if (secondPlayerChoice === "paper") {
      result.firstPlayer.win = true;
      result.secondPlayer.win = false;
      result.firstPlayer.points += 1;
    }
    result.round += 1;
    return result;
  }
};
