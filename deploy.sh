ssh -i ../MacbookProCristianEu.pem ubuntu@ec2-34-244-85-66.eu-west-1.compute.amazonaws.com

git clone https://github.com/cristian-moreno-ruiz/mini-trader.git

cd mini-trader

sudo apt update

sudo apt install nodejs

sudo apt install npm

npm install
npm run build

###### Don't forget the .env


sudo npm install pm2 -g

pm2 start dist/index.js
pm2 list
pm2 show index
pm2 logs
pm2 stop index
pm2 restart index

#pm2 startup
#pm2 unstartup
#pm2 save

### PULL BUILD AND RESTART
cd mini-trader && git pull && npm run build && pm2 restart index






## DIRECT

ssh -i ../MacbookProCristianEu.pem ubuntu@ec2-34-240-59-163.eu-west-1.compute.amazonaws.com "ls"


### Avoid need of increasing memory by increasing swap

https://stackoverflow.com/questions/17173972/how-do-you-add-swap-to-an-ec2-instance

sudo /bin/dd if=/dev/zero of=/var/swap.1 bs=1M count=1024
sudo /sbin/mkswap /var/swap.1
sudo chmod 600 /var/swap.1
sudo /sbin/swapon /var/swap.1

#To enable it by default after reboot, add this line to /etc/fstab:

/var/swap.1   swap    swap    defaults        0   0