from flask import Flask, render_template, request, redirect, url_for, session as flask_session
from sqlalchemy import create_engine, Column, String, Integer, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

app = Flask(__name__)
app.secret_key = 'your-secret-key-here'  # ВАЖНО!


engine = create_engine('sqlite:///user.db')
Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    name = Column(String)
    age = Column(Integer)
    password = Column(String)
    email = Column(String)  # исправлено: email вместо mail
    phone = Column(String)
    is_admin = Column(Integer,default=0) # 0 - normal 1 - admin
    #zvaz s produktami
    products = relationship("Products", back_populates="user", cascade="all,delete-orphan")
        

class Products(Base):
    __tablename__ = 'products'
    id = Column(Integer, primary_key=True)
    product = Column(String)
    amount = Column(Integer)
    price = Column(Integer)
    description = Column(String)
    pic = Column(String, default="https://www.freeiconspng.com/thumbs/no-image-icon/no-image-icon-23.jpg")
    user_id = Column(Integer, ForeignKey('users.id'))
    #obratnaja zvaz
    user = relationship("User",back_populates="products")

# Создаем таблицы
Base.metadata.create_all(engine)

Session = sessionmaker(bind=engine)

#admin

@app.route("/admin", methods = ["GET","POST"])
def admin():
    if 'user_id' not in flask_session:
        return redirect(url_for("login"))
    session = Session()
    user = session.query(User).filter_by(id=flask_session['user_id']).first()
    session.close()
    if user.is_admin != 1:
        return "Access denied. Admin only!",403
    session = Session()
    users = session.query(User).all()
    products = session.query(Products).all()
    session.close()
    return render_template("admin.html", users=users, products=products, user=user)

@app.route("/add_product", methods = ["GET","POST"])
def add_product():
    if 'user_id' not in flask_session:
        return redirect(url_for("login"))
    session = Session()
    user = session.query(User).filter_by(id=flask_session['user_id']).first()
    session.close()
    if user.is_admin != 1:
        return "Access denied. Admin only!",403

    if request.method == "POST":
        product = request.form.get("product")
        amount = int(request.form.get("amount"))#
        price = int(request.form.get("price"))
        description = request.form.get("description")
        pic = request.form.get("pic")
        session = Session()
        new_product = Products(product = product, amount = amount, price = price,pic=pic, description = description)
        session.add(new_product)
        session.commit()
        session.close()
        return redirect(url_for("show_products"))
    return render_template("add_product.html", user=user)


@app.route("/show_products", methods = ["GET","POST"])
def show_products():
    session = Session()
    products = session.query(Products).all()
    session.close()
    return render_template("show_products.html", products = products)

@app.route("/login", methods=["POST", "GET"])
def login():
    if request.method == "POST":
        name = request.form.get("name")
        password = request.form.get("password")
        session = Session()
        user = session.query(User).filter_by(name=name, password=password).first()
        session.close()
        if user:
            flask_session['user_id'] = user.id
            return redirect(url_for("profile"))
        else:
            return render_template("login.html", error="Wrong Name or Password")
    return render_template("login.html")

@app.route("/register", methods=["POST", "GET"])
def reg():
    if request.method == "POST":
        name = request.form.get("name")
        password = request.form.get("password")
        age = int(request.form.get("age"))
        email = request.form.get("email")  # исправлено: email
        phone = request.form.get("phone")
        session = Session()
        existing = session.query(User).filter_by(name=name).first()
        if existing:
            session.close()
            return render_template("register.html", error="This name already exist.")
        
        new_user = User(name=name, password=password, age=age, email=email, phone=phone)
        session.add(new_user)
        session.commit()
        session.close()
        return redirect(url_for("login"))
    return render_template("register.html")

@app.route("/profile", methods=["GET", "POST"])
def profile():
    if 'user_id' not in flask_session:
        return redirect(url_for("login"))
    
    session = Session()
    user = session.query(User).filter_by(id=flask_session['user_id']).first()  # добавлены скобки
    session.close()  # добавлено закрытие
    return render_template("profile.html", user=user)

@app.route("/logout")
def logout():
    flask_session.pop('user_id', None)
    return redirect(url_for("login"))


if __name__ == "__main__":
    # session = Session()
    # admin = User(name ="admin",age = 14, password = "admin123",email = "admin@mail.ru",phone = "+7 777 77 77 77",is_admin = 1)
    # session.add(admin)
    # session.commit()
    
    app.run(debug=True)

