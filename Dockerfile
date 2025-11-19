FROM nginx:alpine

# Copy app files
COPY ./ /usr/share/nginx/html

# Replace default nginx config
RUN rm -f /etc/nginx/conf.d/default.conf
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]