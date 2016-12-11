function User(name, score, progress){
    this.name = name;
    this.score = score;
    this.progress = progress;

    users[name] = this;
}